"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { AppSettingsPanel } from "../components/app-settings-panel";
import { BottomNav } from "../components/bottom-nav";
import { GameHistoryCards } from "../components/game-history-cards";
import { GameReadyPanel } from "../components/game-ready-panel";
import { GameShell } from "../components/game-shell";
import { PinEntry } from "../components/pin-entry";
import { RolePicker } from "../components/role-picker";
import { RoomFull } from "../components/room-full";
import { TopStatusBar } from "../components/top-status-bar";
import { getOrCreateDeviceId } from "../lib/device";
import {
  createClientActionId,
  feedbackLabel,
  hapticTap,
  playTone,
  questionGameNeedsPeer,
  shouldResolveByEventKind,
  type ActionFeedbackModel,
  type ActionEventName,
  type AnyTrackedPayload,
  type PendingAction
} from "../lib/action-feedback";
import { resolveFeedbackTone, shouldAutoDismiss } from "../lib/ui-feedback";
import { readThemeMode, resolveTheme, saveThemeMode } from "../lib/theme";
import { resolveTab } from "../lib/ui-state";
import type {
  AppTab,
  AuthJoinPayload,
  AuthStatePayload,
  ConnectionStatus,
  GameActionPayload,
  GameAckPayload,
  GameConfigPayload,
  GameEventPayload,
  GameId,
  GameStartPayload,
  GameStatusPayload,
  PresenceState,
  QuestionAddPayload,
  ResolvedTheme,
  Role,
  SessionConfigPayload,
  ThemeMode,
  UiMessage,
  UiMessageTone
} from "../lib/types";

const SAVED_PIN_KEY = "duoplay_pin";
const SOUND_CUES_KEY = "duoplay_sound_cues";

const initialPresence: PresenceState = {
  online: {
    Sami: false,
    Patryk: false
  },
  occupiedRoles: []
};

const defaultSessionConfig: SessionConfigPayload = {
  heartbeatIntervalMs: 10000,
  sessionTtlMs: 30000
};

type Phase = "pin" | "choose-role" | "room-full" | "lobby";

function isPresenceEqual(a: PresenceState, b: PresenceState): boolean {
  return (
    a.online.Sami === b.online.Sami &&
    a.online.Patryk === b.online.Patryk &&
    a.occupiedRoles.length === b.occupiedRoles.length &&
    a.occupiedRoles.every((role, index) => role === b.occupiedRoles[index])
  );
}

export default function HomePage() {
  const socketRef = useRef<Socket | null>(null);
  const activePinRef = useRef("");
  const lastAuthPayloadRef = useRef<AuthJoinPayload | null>(null);
  const authTimeoutRef = useRef<number | null>(null);
  const lastPresenceRef = useRef<PresenceState>(initialPresence);
  const lastGameStateSignatureRef = useRef("");
  const meRoleRef = useRef<Role | undefined>(undefined);
  const pendingActionsRef = useRef<Map<string, PendingAction>>(new Map());
  const pendingActionTimeoutsRef = useRef<Map<string, number>>(new Map());
  const actionFeedbackRef = useRef<ActionFeedbackModel | null>(null);
  const lastActionFeedbackStateRef = useRef<string>("idle");

  const [phase, setPhase] = useState<Phase>("pin");
  const [pin, setPin] = useState("");
  const [activePin, setActivePin] = useState("");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [meRole, setMeRole] = useState<Role | undefined>();
  const [presence, setPresence] = useState<PresenceState>(initialPresence);
  const [gameState, setGameState] = useState<GameStatusPayload | null>(null);
  const [feedback, setFeedback] = useState<UiMessage | undefined>();
  const [isFeedbackLeaving, setIsFeedbackLeaving] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("offline");
  const [sessionConfig, setSessionConfig] = useState<SessionConfigPayload>(defaultSessionConfig);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [prefersDark, setPrefersDark] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [activeTab, setActiveTab] = useState<AppTab>("lobby");
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackModel | null>(null);
  const [soundCuesEnabled, setSoundCuesEnabled] = useState(false);

  const pushFeedback = useCallback((text: string, tone: UiMessageTone): void => {
    setIsFeedbackLeaving(false);
    setFeedback({ text, tone });
  }, []);

  const clearFeedback = useCallback((): void => {
    setIsFeedbackLeaving(false);
    setFeedback(undefined);
  }, []);

  const clearAuthTimeout = useCallback((): void => {
    if (authTimeoutRef.current !== null) {
      window.clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  }, []);

  const clearTrackedActionTimeout = useCallback((actionId: string): void => {
    const timeoutId = pendingActionTimeoutsRef.current.get(actionId);
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
      pendingActionTimeoutsRef.current.delete(actionId);
    }
  }, []);

  const clearAllTrackedActions = useCallback((): void => {
    for (const timeoutId of pendingActionTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    pendingActionTimeoutsRef.current.clear();
    pendingActionsRef.current.clear();
    setActionFeedback(null);
  }, []);

  const applyPresenceUpdate = useCallback((nextPresence: PresenceState): void => {
    if (isPresenceEqual(lastPresenceRef.current, nextPresence)) {
      return;
    }

    lastPresenceRef.current = nextPresence;
    setPresence(nextPresence);
  }, []);

  const applyGameState = useCallback((nextState: GameStatusPayload): void => {
    const signature = JSON.stringify(nextState);
    if (signature === lastGameStateSignatureRef.current) {
      return;
    }

    lastGameStateSignatureRef.current = signature;
    setGameState(nextState);

    const liveFeedback = actionFeedbackRef.current;
    if (!liveFeedback) {
      return;
    }

    const pending = pendingActionsRef.current.get(liveFeedback.actionId);
    if (!pending) {
      return;
    }

    if (liveFeedback.state === "sending") {
      const nextStateValue =
        questionGameNeedsPeer(pending.payload) && "type" in pending.payload
          ? "waiting_peer"
          : "resolved";
      setActionFeedback((current) =>
        current && current.actionId === pending.id
          ? {
              ...current,
              state: nextStateValue
            }
          : current
      );

      if (nextStateValue === "resolved") {
        clearTrackedActionTimeout(pending.id);
        pendingActionsRef.current.delete(pending.id);
      }
      return;
    }

    if (liveFeedback.state === "acked" || liveFeedback.state === "waiting_peer") {
      const active = nextState.activeGame;
      if (
        questionGameNeedsPeer(pending.payload) &&
        active &&
        meRoleRef.current &&
        active.gameId === pending.payload.gameId &&
        active.phase === "in_round" &&
        "submittedRoles" in active &&
        active.submittedRoles.includes(meRoleRef.current)
      ) {
        setActionFeedback((current) =>
          current && current.actionId === pending.id
            ? {
                ...current,
                state: "waiting_peer"
              }
            : current
        );
        return;
      }

      setActionFeedback((current) =>
        current && current.actionId === pending.id
          ? {
              ...current,
              state: "resolved"
            }
          : current
      );
      clearTrackedActionTimeout(pending.id);
      pendingActionsRef.current.delete(pending.id);
    }
  }, [clearTrackedActionTimeout]);

  useEffect(() => {
    activePinRef.current = activePin;
  }, [activePin]);

  useEffect(() => {
    meRoleRef.current = meRole;
  }, [meRole]);

  useEffect(() => {
    actionFeedbackRef.current = actionFeedback;
  }, [actionFeedback]);

  useEffect(() => {
    const nextState = actionFeedback?.state ?? "idle";
    const prevState = lastActionFeedbackStateRef.current;
    if (nextState === prevState) {
      return;
    }

    lastActionFeedbackStateRef.current = nextState;

    if (nextState === "resolved") {
      hapticTap("success");
      playTone(soundCuesEnabled, "success");
      return;
    }

    if (nextState === "waiting_peer") {
      hapticTap("warning");
      return;
    }

    if (nextState === "failed") {
      hapticTap("error");
      playTone(soundCuesEnabled, "error");
    }
  }, [actionFeedback?.state, soundCuesEnabled]);

  const emitTracked = useCallback(
    (event: ActionEventName, payload: AnyTrackedPayload): boolean => {
      const socket = socketRef.current;
      if (!socket) {
        pushFeedback("Brak aktywnego połączenia z serwerem.", "error");
        return false;
      }

      const clientActionId = createClientActionId(event.replace(":", "_"));
      const enrichedPayload = {
        ...payload,
        clientActionId,
        clientSentAt: Date.now()
      } as AnyTrackedPayload;

      const pending: PendingAction = {
        id: clientActionId,
        event,
        payload: enrichedPayload,
        createdAt: Date.now(),
        attempts: 1
      };

      pendingActionsRef.current.set(clientActionId, pending);
      setActionFeedback({
        actionId: clientActionId,
        state: "sending",
        label: feedbackLabel(enrichedPayload),
        gameId: enrichedPayload.gameId
      });

      const timeoutId = window.setTimeout(() => {
        const stillPending = pendingActionsRef.current.get(clientActionId);
        if (!stillPending) {
          return;
        }

        setActionFeedback({
          actionId: clientActionId,
          state: "failed",
          label: feedbackLabel(enrichedPayload),
          gameId: enrichedPayload.gameId,
          errorCode: "ACK_TIMEOUT"
        });
      }, 2500);
      pendingActionTimeoutsRef.current.set(clientActionId, timeoutId);

      socket.emit(event, enrichedPayload);
      return true;
    },
    [pushFeedback]
  );

  const retryLastAction = useCallback((): void => {
    const feedbackState = actionFeedback;
    if (!feedbackState || feedbackState.state !== "failed") {
      return;
    }

    const pending = pendingActionsRef.current.get(feedbackState.actionId);
    const socket = socketRef.current;
    if (!pending || !socket) {
      return;
    }

    clearTrackedActionTimeout(pending.id);
    pending.attempts += 1;
    pending.createdAt = Date.now();
    pendingActionsRef.current.set(pending.id, pending);
    setActionFeedback({
      actionId: pending.id,
      state: "sending",
      label: feedbackLabel(pending.payload),
      gameId: pending.payload.gameId
    });

    const timeoutId = window.setTimeout(() => {
      const stillPending = pendingActionsRef.current.get(pending.id);
      if (!stillPending) {
        return;
      }

      setActionFeedback({
        actionId: pending.id,
        state: "failed",
        label: feedbackLabel(pending.payload),
        gameId: pending.payload.gameId,
        errorCode: "ACK_TIMEOUT"
      });
    }, 2500);
    pendingActionTimeoutsRef.current.set(pending.id, timeoutId);

    socket.emit(pending.event, pending.payload);
  }, [actionFeedback, clearTrackedActionTimeout]);

  useEffect(() => {
    const savedPin = window.localStorage.getItem(SAVED_PIN_KEY);
    if (savedPin) {
      setPin(savedPin);
      setActivePin(savedPin);
      activePinRef.current = savedPin;
    }

    setThemeMode(readThemeMode(window.localStorage));
    setSoundCuesEnabled(window.localStorage.getItem(SOUND_CUES_KEY) === "1");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const nextTheme = resolveTheme(themeMode, prefersDark);
    setResolvedTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    saveThemeMode(window.localStorage, themeMode);
  }, [themeMode, prefersDark]);

  useEffect(() => {
    window.localStorage.setItem(SOUND_CUES_KEY, soundCuesEnabled ? "1" : "0");
  }, [soundCuesEnabled]);

  useEffect(() => {
    const socket = io({
      autoConnect: false,
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("online");
      if (lastAuthPayloadRef.current) {
        socket.emit("auth:join", lastAuthPayloadRef.current);
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus(lastAuthPayloadRef.current ? "reconnecting" : "offline");
    });

    socket.on("connect_error", () => {
      setConnectionStatus(lastAuthPayloadRef.current ? "reconnecting" : "offline");
      setIsBusy(false);
      clearAuthTimeout();
      pushFeedback("Brak połączenia z serwerem. Sprawdź internet i konfigurację hosta.", "error");
    });

    socket.on("auth:state", (state: AuthStatePayload) => {
      setIsBusy(false);
      clearAuthTimeout();

      if (!state.ok) {
        if (state.roomFull) {
          setPhase("room-full");
          pushFeedback("Pokój jest aktualnie pełny.", "warning");
          return;
        }

        setPhase("pin");
        return;
      }

      if (state.requiresChoice) {
        setPhase("choose-role");
        setAvailableRoles(state.availableRoles);
        clearFeedback();
        return;
      }

      if (state.meRole) {
        setMeRole(state.meRole);
        setPhase("lobby");
        setActiveTab("lobby");
        clearFeedback();

        const pinValue = lastAuthPayloadRef.current?.pin ?? activePinRef.current;
        if (pinValue) {
          lastAuthPayloadRef.current = {
            pin: pinValue,
            deviceId: getOrCreateDeviceId(),
            desiredRole: state.meRole
          };
        }
      }
    });

    socket.on("session:config", (payload: SessionConfigPayload) => {
      if (!payload?.heartbeatIntervalMs || !payload?.sessionTtlMs) {
        return;
      }

      setSessionConfig(payload);
    });

    socket.on("presence:update", applyPresenceUpdate);

    socket.on("game:resume", (payload: { state: GameStatusPayload }) => {
      applyGameState(payload.state);
    });

    socket.on("game:state", (payload: GameStatusPayload) => {
      applyGameState(payload);
    });

    socket.on("game:ack", (payload: GameAckPayload) => {
      const pending = pendingActionsRef.current.get(payload.clientActionId);
      if (!pending) {
        return;
      }

      if (!payload.ok) {
        clearTrackedActionTimeout(payload.clientActionId);
        setActionFeedback({
          actionId: payload.clientActionId,
          state: "failed",
          label: feedbackLabel(pending.payload),
          gameId: pending.payload.gameId,
          errorCode: payload.code
        });
        return;
      }

      setActionFeedback({
        actionId: payload.clientActionId,
        state: questionGameNeedsPeer(pending.payload) ? "waiting_peer" : "acked",
        label: feedbackLabel(pending.payload),
        gameId: pending.payload.gameId
      });
    });

    socket.on("game:event", (payload: GameEventPayload) => {
      const activeFeedback = actionFeedbackRef.current;
      if (!activeFeedback) {
        return;
      }

      const pending = pendingActionsRef.current.get(activeFeedback.actionId);
      if (!pending) {
        return;
      }

      if (!shouldResolveByEventKind(payload?.kind, pending.payload)) {
        return;
      }

      clearTrackedActionTimeout(pending.id);
      pendingActionsRef.current.delete(pending.id);
      setActionFeedback({
        actionId: pending.id,
        state: "resolved",
        label: feedbackLabel(pending.payload),
        gameId: pending.payload.gameId
      });
    });

    socket.on("game:result", (payload: { summary?: string }) => {
      void payload;
    });

    socket.on("question:added", () => {
      return;
    });

    socket.on("error", (payload: { message?: string } | string) => {
      if (typeof payload === "string") {
        pushFeedback(payload, resolveFeedbackTone("error"));
        return;
      }

      if (payload?.message) {
        pushFeedback(payload.message, resolveFeedbackTone("error"));
      }
    });

    return () => {
      clearAuthTimeout();
      clearAllTrackedActions();
      socket.disconnect();
      socket.removeAllListeners();
      socketRef.current = null;
    };
  }, [
    applyGameState,
    applyPresenceUpdate,
    clearAuthTimeout,
    clearAllTrackedActions,
    clearFeedback,
    clearTrackedActionTimeout,
    pushFeedback
  ]);

  useEffect(() => {
    if (phase !== "lobby" || !meRole) {
      return;
    }

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    const ping = () => {
      socket.emit("presence:ping", { ts: Date.now() });
    };

    ping();

    const interval = window.setInterval(() => {
      if (!socket.connected) {
        return;
      }
      ping();
    }, Math.max(1000, sessionConfig.heartbeatIntervalMs));

    return () => {
      window.clearInterval(interval);
    };
  }, [phase, meRole, sessionConfig.heartbeatIntervalMs, connectionStatus]);

  useEffect(() => {
    if (phase !== "lobby") {
      return;
    }

    const nextTab = resolveTab(activeTab, Boolean(gameState?.activeGame));
    if (!gameState?.activeGame && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [phase, gameState?.activeGame, activeTab]);

  useEffect(() => {
    if (!feedback || !shouldAutoDismiss(feedback.tone)) {
      return;
    }

    let exitTimeout: number | null = null;
    const timeout = window.setTimeout(() => {
      setIsFeedbackLeaving(true);
      exitTimeout = window.setTimeout(() => {
        clearFeedback();
      }, 180);
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
      if (exitTimeout !== null) {
        window.clearTimeout(exitTimeout);
      }
    };
  }, [feedback, clearFeedback]);

  const joinRoom = useCallback((roomPin: string, desiredRole?: Role): void => {
    const socket = socketRef.current;
    if (!socket) {
      pushFeedback("Socket nie jest gotowy. Odśwież stronę.", "error");
      return;
    }

    const normalizedPin = roomPin.trim();
    if (normalizedPin.length < 4) {
      pushFeedback("Kod pokoju powinien mieć minimum 4 znaki.", "error");
      return;
    }

    setIsBusy(true);
    clearFeedback();
    setConnectionStatus(socket.connected ? "online" : "connecting");

    const payload: AuthJoinPayload = {
      pin: normalizedPin,
      deviceId: getOrCreateDeviceId(),
      ...(desiredRole ? { desiredRole } : {})
    };

    lastAuthPayloadRef.current = payload;

    clearAuthTimeout();
    authTimeoutRef.current = window.setTimeout(() => {
      setIsBusy(false);
      pushFeedback("Timeout połączenia. Spróbuj ponownie za chwilę.", "error");
    }, 8000);

    if (!socket.connected) {
      socket.connect();
      return;
    }

    socket.emit("auth:join", payload);
  }, [clearAuthTimeout, clearFeedback, pushFeedback]);

  const onSubmitPin = useCallback((): void => {
    const normalizedPin = pin.trim();
    setActivePin(normalizedPin);
    activePinRef.current = normalizedPin;
    window.localStorage.setItem(SAVED_PIN_KEY, normalizedPin);
    joinRoom(normalizedPin);
  }, [joinRoom, pin]);

  const onPickRole = useCallback((role: Role): void => {
    joinRoom(activePin || pin, role);
  }, [activePin, joinRoom, pin]);

  const onReadyChange = useCallback((gameId: GameId, ready: boolean): void => {
    emitTracked("game:ready", { gameId, ready });
  }, [emitTracked]);

  const onStartGame = useCallback((payload: GameStartPayload): void => {
    if (gameState?.activeGameId === payload.gameId && gameState.activeGame) {
      setActiveTab("game");
      return;
    }

    if (!emitTracked("game:start", payload)) {
      return;
    }

    setActiveTab("game");
  }, [emitTracked, gameState?.activeGame, gameState?.activeGameId]);

  const onGameAction = useCallback((payload: GameActionPayload): void => {
    emitTracked("game:action", payload);
  }, [emitTracked]);

  const onConfigureGame = useCallback((payload: GameConfigPayload): void => {
    emitTracked("game:config", payload);
  }, [emitTracked]);

  const onAddQuestion = useCallback((payload: QuestionAddPayload): void => {
    emitTracked("question:add", payload);
  }, [emitTracked]);

  const connectionLabel = useMemo(() => {
    if (connectionStatus === "online") {
      return "Online";
    }

    if (connectionStatus === "connecting") {
      return "Łączenie";
    }

    if (connectionStatus === "reconnecting") {
      return "Ponowne łączenie";
    }

    return "Offline";
  }, [connectionStatus]);

  return (
    <main className="app-shell motion-app-enter" data-phase={phase} data-resolved-theme={resolvedTheme}>
      <TopStatusBar
        meRole={meRole}
        activeGame={gameState?.activeGame ?? null}
        connectionStatus={connectionStatus}
        connectionLabel={connectionLabel}
        themeMode={themeMode}
      />

      <section className="main-viewport" data-testid="main-viewport">
        <div className="view-stack">
          {phase === "pin" ? (
            <PinEntry
              pin={pin}
              onPinChange={setPin}
              onSubmit={onSubmitPin}
              isBusy={isBusy}
              message={feedback?.text}
            />
          ) : null}

          {phase === "choose-role" ? (
            <RolePicker availableRoles={availableRoles} onPick={onPickRole} />
          ) : null}

          {phase === "room-full" ? (
            <RoomFull />
          ) : null}

          {phase === "lobby" && meRole ? (
            <>
              {activeTab === "game" ? (
                <section className="tab-section motion-tab-switch" data-testid="tab-panel-game">
                  {gameState?.activeGame ? (
                    <GameShell
                      meRole={meRole}
                      activeGame={gameState.activeGame}
                      latestResult={gameState.latestResult}
                      onAction={onGameAction}
                      onAddQuestion={onAddQuestion}
                      actionFeedback={actionFeedback}
                      onRetryAction={retryLastAction}
                    />
                  ) : (
                    <>
                      <section className="screen-title screen-title--duel">
                        <p className="section-kicker">No Active Duel</p>
                        <h2>Brak aktywnej gry</h2>
                        <p>Przejdź do Lobby i kliknij gotowość, aby wystartować.</p>
                      </section>
                    </>
                  )}
                </section>
              ) : null}

              {activeTab === "lobby" ? (
                <section className="tab-section motion-tab-switch" data-testid="tab-panel-lobby">
                  {gameState ? (
                    <GameReadyPanel
                      meRole={meRole}
                      state={gameState}
                      presence={presence}
                      onReadyChange={onReadyChange}
                      onStart={onStartGame}
                      onConfigure={onConfigureGame}
                    />
                  ) : null}
                </section>
              ) : null}

              {activeTab === "history" ? (
                <section className="tab-section motion-tab-switch" data-testid="tab-panel-history">
                  <section className="screen-title screen-title--duel">
                    <p className="section-kicker">Archive Mode</p>
                    <h1>Historia</h1>
                    <p>Wyniki, ustawienia lokalne i zapis ostatnich pojedynków.</p>
                  </section>
                  <AppSettingsPanel
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    soundCuesEnabled={soundCuesEnabled}
                    onToggleSoundCues={() => setSoundCuesEnabled((prev) => !prev)}
                  />
                  {gameState?.history && gameState.history.length > 0 ? (
                    <GameHistoryCards history={gameState.history} />
                  ) : (
                    <section className="empty-state empty-state--duel">
                      <h2>Brak historii</h2>
                      <p>Pierwszy mecz zapisze się tutaj automatycznie.</p>
                    </section>
                  )}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {phase === "lobby" && meRole ? (
        <BottomNav
          activeTab={activeTab}
          onChange={setActiveTab}
          historyCount={gameState?.history.length ?? 0}
          gameActive={Boolean(gameState?.activeGame)}
        />
      ) : null}

      {phase === "lobby" && feedback ? (
        <p
          className={`feedback-toast feedback-inline feedback-inline--${feedback.tone} ${
            isFeedbackLeaving ? "is-leaving" : "is-entering"
          }`}
          role="status"
          data-testid="feedback"
        >
          {feedback.text}
        </p>
      ) : null}
    </main>
  );
}
