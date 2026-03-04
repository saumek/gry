import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import type { AuthStatePayload, GameAckPayload, Role } from "../../lib/types";
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
  const actionCacheByRole = new Map<Role, Map<string, number>>();
  const ACTION_ID_TTL_MS = 90_000;
  let lastPresenceRevisionEmitted = -1;
  let lastGameRevisionEmitted = -1;

  const emitAck = (
    socket: Parameters<typeof io.on>[1] extends (socket: infer S) => unknown ? S : never,
    clientActionId: string | undefined,
    ok: boolean,
    code?: string
  ): void => {
    if (!clientActionId) {
      return;
    }

    const payload: GameAckPayload = {
      clientActionId,
      ok,
      acceptedAt: new Date().toISOString(),
      ...(code ? { code } : {})
    };
    socket.emit("game:ack", payload);
  };

  const extractClientActionId = (payload: unknown): string | undefined => {
    if (!payload || typeof payload !== "object") {
      return undefined;
    }

    const value = (payload as { clientActionId?: unknown }).clientActionId;
    if (typeof value !== "string" || value.trim().length === 0) {
      return undefined;
    }

    return value;
  };

  const isDuplicateAction = (role: Role, clientActionId: string): boolean => {
    const roleCache = actionCacheByRole.get(role);
    if (!roleCache) {
      return false;
    }

    return roleCache.has(clientActionId);
  };

  const rememberAction = (role: Role, clientActionId: string): void => {
    const now = Date.now();
    const roleCache = actionCacheByRole.get(role) ?? new Map<string, number>();
    roleCache.set(clientActionId, now + ACTION_ID_TTL_MS);
    actionCacheByRole.set(role, roleCache);
  };

  const cleanupActionCache = (): void => {
    const now = Date.now();
    for (const [role, cache] of actionCacheByRole.entries()) {
      for (const [id, expiresAt] of cache.entries()) {
        if (expiresAt <= now) {
          cache.delete(id);
        }
      }

      if (cache.size === 0) {
        actionCacheByRole.delete(role);
      }
    }
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

  const flushPresenceIfChanged = (): void => {
    const revision = sessionManager.getPresenceRevision();
    if (revision === lastPresenceRevisionEmitted) {
      return;
    }

    lastPresenceRevisionEmitted = revision;
    io.emit("presence:update", sessionManager.getPresence());
  };

  const flushStateIfChanged = (): void => {
    const revision = gameManager.getStateRevision();
    if (revision === lastGameRevisionEmitted) {
      return;
    }

    lastGameRevisionEmitted = revision;
    emitGameStateToAll();
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
        flushPresenceIfChanged();
        flushStateIfChanged();
        return;
      }

      if (!joinResult.meRole) {
        socket.emit("session:config", {
          heartbeatIntervalMs: config.heartbeatIntervalMs,
          sessionTtlMs: config.sessionTtlMs
        });
        flushPresenceIfChanged();
        flushStateIfChanged();
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

      flushPresenceIfChanged();
      flushStateIfChanged();
    });

    socket.on("presence:ping", (payload) => {
      const parsed = pingSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      sessionManager.ping(socket.id);
      flushPresenceIfChanged();
    });

    socket.on("game:ready", (payload) => {
      const clientActionId = extractClientActionId(payload);
      const role = socket.data.role as Role | undefined;
      if (!role) {
        emitAck(socket, clientActionId, false, "UNAUTHORIZED");
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameReadySchema.safeParse(payload);
      if (!parsed.success) {
        emitAck(socket, clientActionId, false, "INVALID_GAME_READY");
        socket.emit("error", {
          code: "INVALID_GAME_READY",
          message: "Niepoprawny payload gotowości gry."
        });
        return;
      }

      if (parsed.data.clientActionId && isDuplicateAction(role, parsed.data.clientActionId)) {
        emitAck(socket, parsed.data.clientActionId, true, "DUPLICATE_IGNORED");
        return;
      }

      const outcome = gameManager.setReady(role, parsed.data.gameId, parsed.data.ready);
      if (!outcome.ok) {
        emitAck(socket, parsed.data.clientActionId, false, "GAME_READY_REJECTED");
        socket.emit("error", {
          code: "GAME_READY_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (parsed.data.clientActionId) {
        rememberAction(role, parsed.data.clientActionId);
      }
      emitAck(socket, parsed.data.clientActionId, true);

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }
      flushStateIfChanged();
    });

    socket.on("game:start", (payload) => {
      const clientActionId = extractClientActionId(payload);
      const role = socket.data.role as Role | undefined;
      if (!role) {
        emitAck(socket, clientActionId, false, "UNAUTHORIZED");
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameStartSchema.safeParse(payload);
      if (!parsed.success) {
        emitAck(socket, clientActionId, false, "INVALID_GAME_START");
        socket.emit("error", {
          code: "INVALID_GAME_START",
          message: "Niepoprawny payload startu gry."
        });
        return;
      }

      if (parsed.data.clientActionId && isDuplicateAction(role, parsed.data.clientActionId)) {
        emitAck(socket, parsed.data.clientActionId, true, "DUPLICATE_IGNORED");
        return;
      }

      const outcome = gameManager.startGame(role, parsed.data, sessionManager.getPresence());
      if (!outcome.ok) {
        emitAck(socket, parsed.data.clientActionId, false, "GAME_START_REJECTED");
        socket.emit("error", {
          code: "GAME_START_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (parsed.data.clientActionId) {
        rememberAction(role, parsed.data.clientActionId);
      }
      emitAck(socket, parsed.data.clientActionId, true);

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      if (outcome.result) {
        io.emit("game:result", outcome.result);
      }

      flushStateIfChanged();
    });

    socket.on("game:config", (payload) => {
      const clientActionId = extractClientActionId(payload);
      const role = socket.data.role as Role | undefined;
      if (!role) {
        emitAck(socket, clientActionId, false, "UNAUTHORIZED");
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameConfigSchema.safeParse(payload);
      if (!parsed.success) {
        emitAck(socket, clientActionId, false, "INVALID_GAME_CONFIG");
        socket.emit("error", {
          code: "INVALID_GAME_CONFIG",
          message: "Niepoprawna konfiguracja gry."
        });
        return;
      }

      if (parsed.data.clientActionId && isDuplicateAction(role, parsed.data.clientActionId)) {
        emitAck(socket, parsed.data.clientActionId, true, "DUPLICATE_IGNORED");
        return;
      }

      const outcome = gameManager.setConfig(role, parsed.data);
      if (!outcome.ok) {
        emitAck(socket, parsed.data.clientActionId, false, "GAME_CONFIG_REJECTED");
        socket.emit("error", {
          code: "GAME_CONFIG_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (parsed.data.clientActionId) {
        rememberAction(role, parsed.data.clientActionId);
      }
      emitAck(socket, parsed.data.clientActionId, true);

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      flushStateIfChanged();
    });

    socket.on("question:add", (payload) => {
      const clientActionId = extractClientActionId(payload);
      const role = socket.data.role as Role | undefined;
      if (!role) {
        emitAck(socket, clientActionId, false, "UNAUTHORIZED");
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = questionAddSchema.safeParse(payload);
      if (!parsed.success) {
        emitAck(socket, clientActionId, false, "INVALID_QUESTION");
        socket.emit("error", {
          code: "INVALID_QUESTION",
          message: "Niepoprawny format pytania."
        });
        return;
      }

      if (parsed.data.clientActionId && isDuplicateAction(role, parsed.data.clientActionId)) {
        emitAck(socket, parsed.data.clientActionId, true, "DUPLICATE_IGNORED");
        return;
      }

      const outcome = gameManager.addQuestion(role, parsed.data);
      if (!outcome.ok) {
        emitAck(socket, parsed.data.clientActionId, false, "QUESTION_ADD_REJECTED");
        socket.emit("error", {
          code: "QUESTION_ADD_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (parsed.data.clientActionId) {
        rememberAction(role, parsed.data.clientActionId);
      }
      emitAck(socket, parsed.data.clientActionId, true);

      if (outcome.questionAdded) {
        io.emit("question:added", outcome.questionAdded);
      }

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      flushStateIfChanged();
    });

    socket.on("game:action", (payload) => {
      const clientActionId = extractClientActionId(payload);
      const role = socket.data.role as Role | undefined;
      if (!role) {
        emitAck(socket, clientActionId, false, "UNAUTHORIZED");
        socket.emit("error", {
          code: "UNAUTHORIZED",
          message: "Najpierw dołącz do pokoju."
        });
        return;
      }
      sessionManager.ping(socket.id);

      const parsed = gameActionSchema.safeParse(payload);
      if (!parsed.success) {
        emitAck(socket, clientActionId, false, "INVALID_GAME_ACTION");
        socket.emit("error", {
          code: "INVALID_GAME_ACTION",
          message: "Niepoprawna akcja gry."
        });
        return;
      }

      if (parsed.data.clientActionId && isDuplicateAction(role, parsed.data.clientActionId)) {
        emitAck(socket, parsed.data.clientActionId, true, "DUPLICATE_IGNORED");
        return;
      }

      const outcome = gameManager.handleAction(role, parsed.data);
      if (!outcome.ok) {
        emitAck(socket, parsed.data.clientActionId, false, "GAME_ACTION_REJECTED");
        socket.emit("error", {
          code: "GAME_ACTION_REJECTED",
          message: outcome.errorMessage
        });
        return;
      }

      if (parsed.data.clientActionId) {
        rememberAction(role, parsed.data.clientActionId);
      }
      emitAck(socket, parsed.data.clientActionId, true);

      if (outcome.event) {
        io.emit("game:event", outcome.event);
      }

      if (outcome.result) {
        io.emit("game:result", outcome.result);
      }

      flushStateIfChanged();
    });

    socket.on("disconnect", () => {
      sessionManager.disconnect(socket.id);
      flushPresenceIfChanged();
    });
  });

  const sweeper = setInterval(() => {
    sessionManager.cleanupExpired();
    cleanupActionCache();
    const expiredEndRequestEvent = gameManager.cleanupExpiredEndRequests(Date.now());
    if (expiredEndRequestEvent) {
      io.emit("game:event", expiredEndRequestEvent);
    }
    flushPresenceIfChanged();
    flushStateIfChanged();
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
