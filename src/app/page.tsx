"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { BottomNav } from "../components/bottom-nav";
import { GameHistoryCards } from "../components/game-history-cards";
import { GameReadyPanel } from "../components/game-ready-panel";
import { GameShell } from "../components/game-shell";
import { PinEntry } from "../components/pin-entry";
import { PresenceStrip } from "../components/presence-strip";
import { RolePicker } from "../components/role-picker";
import { RoomFull } from "../components/room-full";
import { TopStatusBar } from "../components/top-status-bar";
import { getOrCreateDeviceId } from "../lib/device";
import { resolveFeedbackTone, shouldAutoDismiss } from "../lib/ui-feedback";
import { readThemeMode, resolveTheme, saveThemeMode } from "../lib/theme";
import { resolveTab } from "../lib/ui-state";
import type {
  AppTab,
  AuthJoinPayload,
  AuthStatePayload,
  ConnectionStatus,
  GameActionPayload,
  GameId,
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

export default function HomePage() {
  const socketRef = useRef<Socket | null>(null);
  const activePinRef = useRef("");
  const lastAuthPayloadRef = useRef<AuthJoinPayload | null>(null);

  const [phase, setPhase] = useState<Phase>("pin");
  const [pin, setPin] = useState("");
  const [activePin, setActivePin] = useState("");
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [meRole, setMeRole] = useState<Role | undefined>();
  const [presence, setPresence] = useState<PresenceState>(initialPresence);
  const [gameState, setGameState] = useState<GameStatusPayload | null>(null);
  const [feedback, setFeedback] = useState<UiMessage | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("offline");
  const [sessionConfig, setSessionConfig] = useState<SessionConfigPayload>(defaultSessionConfig);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [prefersDark, setPrefersDark] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [activeTab, setActiveTab] = useState<AppTab>("lobby");

  const pushFeedback = (text: string, tone: UiMessageTone): void => {
    setFeedback({ text, tone });
  };

  const clearFeedback = (): void => {
    setFeedback(undefined);
  };

  useEffect(() => {
    activePinRef.current = activePin;
  }, [activePin]);

  useEffect(() => {
    const savedPin = window.localStorage.getItem(SAVED_PIN_KEY);
    if (savedPin) {
      setPin(savedPin);
      setActivePin(savedPin);
      activePinRef.current = savedPin;
    }

    setThemeMode(readThemeMode(window.localStorage));
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
    });

    socket.on("auth:state", (state: AuthStatePayload) => {
      setIsBusy(false);

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

    socket.on("presence:update", (nextPresence: PresenceState) => {
      setPresence(nextPresence);
    });

    socket.on("game:resume", (payload: { state: GameStatusPayload }) => {
      setGameState(payload.state);
    });

    socket.on("game:state", (payload: GameStatusPayload) => {
      setGameState(payload);
    });

    socket.on("game:event", (payload: { message?: string }) => {
      if (payload?.message) {
        pushFeedback(payload.message, resolveFeedbackTone("event"));
      }
    });

    socket.on("game:result", (payload: { summary?: string }) => {
      if (payload?.summary) {
        pushFeedback(payload.summary, resolveFeedbackTone("result"));
      }
    });

    socket.on("question:added", () => {
      pushFeedback("Nowe pytanie zostało dodane do puli.", resolveFeedbackTone("question_added"));
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
      socket.disconnect();
      socket.removeAllListeners();
      socketRef.current = null;
    };
  }, []);

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
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [phase, gameState?.activeGame, activeTab]);

  useEffect(() => {
    if (!feedback || !shouldAutoDismiss(feedback.tone)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearFeedback();
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [feedback]);

  const joinRoom = (roomPin: string, desiredRole?: Role): void => {
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

    if (!socket.connected) {
      socket.connect();
      return;
    }

    socket.emit("auth:join", payload);
  };

  const onSubmitPin = (): void => {
    const normalizedPin = pin.trim();
    setActivePin(normalizedPin);
    activePinRef.current = normalizedPin;
    window.localStorage.setItem(SAVED_PIN_KEY, normalizedPin);
    joinRoom(normalizedPin);
  };

  const onPickRole = (role: Role): void => {
    joinRoom(activePin || pin, role);
  };

  const onReadyChange = (gameId: GameId, ready: boolean): void => {
    socketRef.current?.emit("game:ready", { gameId, ready });
  };

  const onStartGame = (gameId: GameId): void => {
    if (gameState?.activeGameId === gameId && gameState.activeGame) {
      return;
    }

    socketRef.current?.emit("game:start", { gameId });
  };

  const onGameAction = (payload: GameActionPayload): void => {
    socketRef.current?.emit("game:action", payload);
  };

  const onAddQuestion = (payload: QuestionAddPayload): void => {
    socketRef.current?.emit("question:add", payload);
  };

  const headerTitle = useMemo(() => {
    if (!meRole) {
      return "Pokój dwuosobowy";
    }

    return `Zalogowano jako ${meRole}`;
  }, [meRole]);

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
    <main className="app-shell" data-phase={phase}>
      <TopStatusBar
        meRole={meRole}
        activeGame={gameState?.activeGame ?? null}
        connectionStatus={connectionStatus}
        connectionLabel={connectionLabel}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
      />

      <section className="main-viewport" data-testid="main-viewport">
        <div className="view-stack">
          {phase === "pin" ? (
            <>
              <section className="screen-title">
                <h1>DuoPlay</h1>
                <p>{headerTitle}</p>
                <small>{`Motyw: ${resolvedTheme === "dark" ? "ciemny" : "jasny"}`}</small>
              </section>
              <PinEntry
                pin={pin}
                onPinChange={setPin}
                onSubmit={onSubmitPin}
                isBusy={isBusy}
                message={feedback?.text}
              />
            </>
          ) : null}

          {phase === "choose-role" ? (
            <>
              <section className="screen-title">
                <h1>Wybór roli</h1>
                <p>{headerTitle}</p>
              </section>
              <RolePicker availableRoles={availableRoles} onPick={onPickRole} />
            </>
          ) : null}

          {phase === "room-full" ? (
            <>
              <section className="screen-title">
                <h1>Pokój pełny</h1>
                <p>Obie role są zajęte.</p>
              </section>
              <RoomFull />
            </>
          ) : null}

          {phase === "lobby" && meRole ? (
            <>
              {feedback ? (
                <p className={`feedback-inline feedback-inline--${feedback.tone}`} role="status" data-testid="feedback">
                  {feedback.text}
                </p>
              ) : null}

              {activeTab === "game" ? (
                <section className="tab-section" data-testid="tab-panel-game">
                  {gameState?.activeGame ? (
                    <GameShell
                      meRole={meRole}
                      activeGame={gameState.activeGame}
                      latestResult={gameState.latestResult}
                      onAction={onGameAction}
                      onAddQuestion={onAddQuestion}
                    />
                  ) : (
                    <>
                      <section className="screen-title">
                        <h1>Gra</h1>
                        <p>Aktywna sesja i wynik na żywo.</p>
                      </section>
                      <section className="empty-state">
                        <h2>Brak aktywnej gry</h2>
                        <p>Przejdź do Lobby i kliknij gotowość, aby wystartować.</p>
                      </section>
                    </>
                  )}
                </section>
              ) : null}

              {activeTab === "lobby" ? (
                <section className="tab-section" data-testid="tab-panel-lobby">
                  <section className="screen-title">
                    <h1>Lobby</h1>
                    <p>Status osób i start gry.</p>
                  </section>
                  <PresenceStrip presence={presence} meRole={meRole} />
                  {gameState ? (
                    <GameReadyPanel
                      meRole={meRole}
                      state={gameState}
                      onReadyChange={onReadyChange}
                      onStart={onStartGame}
                    />
                  ) : null}
                </section>
              ) : null}

              {activeTab === "history" ? (
                <section className="tab-section" data-testid="tab-panel-history">
                  <section className="screen-title">
                    <h1>Historia</h1>
                    <p>Poprzednie mecze i wyniki.</p>
                  </section>
                  {gameState?.history && gameState.history.length > 0 ? (
                    <GameHistoryCards history={gameState.history} />
                  ) : (
                    <section className="empty-state">
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
    </main>
  );
}
