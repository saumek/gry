import type {
  ActionFeedbackState,
  GameActionPayload,
  GameConfigPayload,
  GameId,
  GameReadyPayload,
  GameStartPayload,
  QuestionAddPayload,
  Role
} from "./types";

export type ActionEventName =
  | "game:action"
  | "game:ready"
  | "game:start"
  | "game:config"
  | "question:add";

export type AnyTrackedPayload =
  | GameActionPayload
  | GameReadyPayload
  | GameStartPayload
  | GameConfigPayload
  | QuestionAddPayload;

export type PendingAction = {
  id: string;
  event: ActionEventName;
  payload: AnyTrackedPayload;
  createdAt: number;
  attempts: number;
};

export type ActionFeedbackModel = {
  actionId: string;
  state: ActionFeedbackState;
  label: string;
  gameId: GameId;
  errorCode?: string;
};

export function createClientActionId(prefix = "act"): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

export function feedbackLabel(payload: AnyTrackedPayload): string {
  if ("type" in payload) {
    if (payload.type === "submit") {
      return "Wysyłanie odpowiedzi";
    }

    if (payload.type === "advance") {
      return "Przejście do kolejnej rundy";
    }

    if (payload.type === "rematch") {
      return "Głos za rewanżem";
    }

    if (payload.type === "request_end") {
      return "Prośba o zakończenie gry";
    }

    if (payload.type === "approve_end") {
      return "Potwierdzenie zakończenia gry";
    }
  }

  if ("ready" in payload) {
    return payload.ready ? "Ustawianie gotowości" : "Cofanie gotowości";
  }

  if ("config" in payload || "category" in payload) {
    return "Aktualizacja konfiguracji";
  }

  if ("text" in payload && "options" in payload) {
    return "Dodawanie pytania";
  }

  return "Wysyłanie akcji";
}

export function questionGameNeedsPeer(payload: AnyTrackedPayload): boolean {
  if (!("type" in payload)) {
    return false;
  }

  if (payload.type !== "submit") {
    return false;
  }

  return (
    payload.gameId === "qa-lightning" ||
    payload.gameId === "better-half" ||
    payload.gameId === "science-quiz" ||
    payload.gameId === "couple-priorities"
  );
}

export function shouldResolveByEventKind(
  eventKind: string | undefined,
  payload: AnyTrackedPayload
): boolean {
  if (!eventKind) {
    return false;
  }

  if (eventKind === "round_revealed" || eventKind === "round_advanced" || eventKind === "game_finished") {
    return true;
  }

  if ("type" in payload) {
    if (payload.type === "submit") {
      return eventKind === "round_revealed";
    }

    if (payload.type === "advance") {
      return eventKind === "round_advanced" || eventKind === "game_finished";
    }

    if (payload.type === "request_end" || payload.type === "approve_end" || payload.type === "reject_end") {
      return eventKind === "end_requested" || eventKind === "end_request_cancelled" || eventKind === "game_aborted";
    }
  }

  if ("ready" in payload) {
    return eventKind === "ready_changed";
  }

  if ("config" in payload || "category" in payload) {
    return eventKind === "config_changed";
  }

  if ("text" in payload && "options" in payload) {
    return eventKind === "ready_changed";
  }

  return false;
}

export function hapticTap(type: "success" | "warning" | "error"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  if (type === "success") {
    navigator.vibrate(10);
    return;
  }

  if (type === "warning") {
    navigator.vibrate([8, 30, 8]);
    return;
  }

  navigator.vibrate([12, 22, 12, 22, 12]);
}

export function playTone(enabled: boolean, type: "success" | "warning" | "error"): void {
  if (!enabled || typeof window === "undefined") {
    return;
  }

  const sfxPath =
    type === "success"
      ? "/assets/sfx/success.wav"
      : type === "warning"
        ? "/assets/sfx/warning.wav"
        : "/assets/sfx/error.wav";

  if (typeof Audio !== "undefined") {
    try {
      const audio = new Audio(sfxPath);
      audio.volume = 0.45;
      void audio.play();
      return;
    } catch {
      // fallback to oscillator
    }
  }

  const AudioCtor =
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtor) {
    return;
  }

  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  const profile =
    type === "success"
      ? { frequency: 620, duration: 0.08 }
      : type === "warning"
        ? { frequency: 420, duration: 0.11 }
        : { frequency: 260, duration: 0.13 };

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(profile.frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
  oscillator.start(now);
  oscillator.stop(now + profile.duration + 0.02);

  oscillator.onended = () => {
    void context.close();
  };
}

export function roleSubmitStatus(submittedRoles: Role[], meRole: Role): ActionFeedbackState {
  if (submittedRoles.includes(meRole)) {
    return "waiting_peer";
  }

  return "resolved";
}
