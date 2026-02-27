import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import type { AuthStatePayload, Role } from "../../lib/types";
import { AppDatabase } from "../db";
import { GameManager } from "../game/game-manager";
import { SessionManager } from "../session/session-manager";
import {
  authJoinSchema,
  gameActionSchema,
  gameConfigSchema,
  gameReadySchema,
  gameStartSchema,
  pingSchema,
  questionAddSchema
} from "./validation";

export type SocketRuntimeConfig = {
  httpServer: HttpServer;
  roomPin: string;
  heartbeatIntervalMs: number;
  sessionTtlMs: number;
  dbPath: string;
};

export type SocketRuntime = {
  io: SocketIOServer;
  close: () => Promise<void>;
  sessionManager: SessionManager;
  db: AppDatabase;
};

export function createSocketRuntime(config: SocketRuntimeConfig): SocketRuntime {
  const io = new SocketIOServer(config.httpServer, {
    transports: ["websocket", "polling"]
  });

  const sessionManager = new SessionManager(config.sessionTtlMs);
  const db = new AppDatabase(config.dbPath);
  const gameManager = new GameManager(db);

  const emitPresence = (): void => {
    io.emit("presence:update", sessionManager.getPresence());
  };

  const emitGameStateToAll = (): void => {
    for (const socket of io.sockets.sockets.values()) {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        continue;
      }

      socket.emit("game:state", gameManager.getStateFor(role));
    }
  };

  io.on("connection", (socket) => {
    socket.on("auth:join", (payload) => {
      const parsed = authJoinSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_AUTH_PAYLOAD",
          message: "Niepoprawne dane logowania do pokoju."
        });
        return;
      }

      if (parsed.data.pin !== config.roomPin) {
        const invalidAuth: AuthStatePayload = {
          ok: false,
          requiresChoice: false,
          availableRoles: [],
          roomFull: false
        };

        socket.emit("auth:state", invalidAuth);
        socket.emit("error", {
          code: "INVALID_PIN",
          message: "Niepoprawny kod pokoju."
        });
        return;
      }

      const joinResult = sessionManager.join({
        deviceId: parsed.data.deviceId,
        socketId: socket.id,
        desiredRole: parsed.data.desiredRole
      });

      const authState: AuthStatePayload = {
        ok: joinResult.ok,
        meRole: joinResult.meRole,
        requiresChoice: joinResult.requiresChoice,
        availableRoles: joinResult.availableRoles,
        roomFull: joinResult.roomFull
      };

      socket.emit("auth:state", authState);

      if (!joinResult.ok) {
        if (joinResult.roomFull) {
          socket.emit("error", {
            code: "ROOM_FULL",
            message: "Pokój jest pełny."
          });
        }
        emitPresence();
        emitGameStateToAll();
        return;
      }

      if (!joinResult.meRole) {
        socket.emit("session:config", {
          heartbeatIntervalMs: config.heartbeatIntervalMs,
          sessionTtlMs: config.sessionTtlMs
        });
        emitPresence();
        emitGameStateToAll();
        return;
      }

      socket.data.role = joinResult.meRole;
      socket.data.deviceId = parsed.data.deviceId;

      socket.emit("game:resume", {
        state: gameManager.getStateFor(joinResult.meRole)
      });
      socket.emit("session:config", {
        heartbeatIntervalMs: config.heartbeatIntervalMs,
        sessionTtlMs: config.sessionTtlMs
      });

      emitPresence();
      emitGameStateToAll();
    });

    socket.on("presence:ping", (payload) => {
      const parsed = pingSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      sessionManager.ping(socket.id);
      emitPresence();
      emitGameStateToAll();
    });

    socket.on("game:ready", (payload) => {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameReadySchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_GAME_READY",
          message: "Niepoprawny payload gotowości gry."
        });
        return;
      }

      const outcome = gameManager.setReady(role, parsed.data.gameId, parsed.data.ready);
      if (!outcome.ok) {
        socket.emit("error", {
          code: "GAME_READY_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }
      emitGameStateToAll();
    });

    socket.on("game:start", (payload) => {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameStartSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_GAME_START",
          message: "Niepoprawny payload startu gry."
        });
        return;
      }

      const outcome = gameManager.startGame(role, parsed.data, sessionManager.getPresence());
      if (!outcome.ok) {
        socket.emit("error", {
          code: "GAME_START_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      if (outcome.result) {
        io.emit("game:result", outcome.result);
      }

      emitGameStateToAll();
    });

    socket.on("game:config", (payload) => {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameConfigSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_GAME_CONFIG",
          message: "Niepoprawna konfiguracja gry."
        });
        return;
      }

      const outcome = gameManager.setConfig(role, parsed.data);
      if (!outcome.ok) {
        socket.emit("error", {
          code: "GAME_CONFIG_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      emitGameStateToAll();
    });

    socket.on("question:add", (payload) => {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = questionAddSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_QUESTION",
          message: "Niepoprawny format pytania."
        });
        return;
      }

      const outcome = gameManager.addQuestion(role, parsed.data);
      if (!outcome.ok) {
        socket.emit("error", {
          code: "QUESTION_ADD_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (outcome.questionAdded) {
        io.emit("question:added", outcome.questionAdded);
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      emitGameStateToAll();
    });

    socket.on("game:action", (payload) => {
      const role = socket.data.role as Role | undefined;
      if (!role) {
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          code: "INVALID_GAME_ACTION",
          message: "Niepoprawna akcja gry."
        });
        return;
      }

      const outcome = gameManager.handleAction(role, parsed.data);
      if (!outcome.ok) {
        socket.emit("error", {
          code: "GAME_ACTION_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      if (outcome.result) {
        io.emit("game:result", outcome.result);
      }

      emitGameStateToAll();
    });

    socket.on("disconnect", () => {
      sessionManager.disconnect(socket.id);
      emitPresence();
      emitGameStateToAll();
    });
  });

  const sweeper = setInterval(() => {
    sessionManager.cleanupExpired();
    const expiredEndRequestEvent = gameManager.cleanupExpiredEndRequests(Date.now());
    if (expiredEndRequestEvent) {
      io.emit("game:event", expiredEndRequestEvent);
    }
    emitPresence();
    emitGameStateToAll();
  }, Math.max(1000, config.heartbeatIntervalMs));

  sweeper.unref();

  return {
    io,
    sessionManager,
    db,
    close: async () => {
      clearInterval(sweeper);
      io.removeAllListeners();
      await io.close();
      db.close();
    }
  };
}
