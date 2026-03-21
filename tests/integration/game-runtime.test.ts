import http from "node:http";
import os from "node:os";
import path from "node:path";

import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

import type { GameStatusPayload } from "../../src/lib/types";
import { createSocketRuntime, SocketRuntime } from "../../src/server/socket/create-runtime";

async function waitForEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

async function waitForConnect(socket: ClientSocket): Promise<void> {
  if (socket.connected) {
    return;
  }

  await new Promise<void>((resolve) => {
    socket.once("connect", () => resolve());
  });
}

async function waitForState(
  socket: ClientSocket,
  predicate: (state: GameStatusPayload) => boolean,
  timeoutMs = 7000
): Promise<GameStatusPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("game:state", onState);
      reject(new Error("Timeout waiting for matching game:state"));
    }, timeoutMs);

    const onState = (payload: GameStatusPayload) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off("game:state", onState);
      resolve(payload);
    };

    socket.on("game:state", onState);
  });
}

async function closeHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        if ((error as NodeJS.ErrnoException).code === "ERR_SERVER_NOT_RUNNING") {
          resolve();
          return;
        }

        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function listenTestServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

describe("game runtime", () => {
  const resources: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const close of resources.reverse()) {
      await close();
    }
    resources.length = 0;
  });

  it(
    "startuje Q&A po gotowości obu osób i reveal następuje po 2 odpowiedziach",
    async () => {
      const dbPath = path.join(os.tmpdir(), `duoplay-game-${Date.now()}.db`);
      const httpServer = http.createServer();

      const runtime: SocketRuntime = createSocketRuntime({
        httpServer,
        roomPin: "1234",
        heartbeatIntervalMs: 10000,
        sessionTtlMs: 30000,
        dbPath
      });

      await listenTestServer(httpServer);
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Brak portu testowego");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;

      resources.push(async () => runtime.close());
      resources.push(async () => closeHttpServer(httpServer));

      const a = createClient(baseUrl, { transports: ["websocket"] });
      const b = createClient(baseUrl, { transports: ["websocket"] });

      resources.push(async () => {
        a.disconnect();
      });
      resources.push(async () => {
        b.disconnect();
      });

      await waitForConnect(a);
      await waitForConnect(b);

      const authAPromise = waitForEvent(a, "auth:state");
      a.emit("auth:join", { pin: "1234", deviceId: "device-aa", desiredRole: "Sami" });
      await authAPromise;

      const authBPromise = waitForEvent(b, "auth:state");
      b.emit("auth:join", { pin: "1234", deviceId: "device-bb", desiredRole: "Patryk" });
      await authBPromise;

      a.emit("game:ready", { gameId: "qa-lightning", ready: true });
      b.emit("game:ready", { gameId: "qa-lightning", ready: true });

      await waitForState(
        a,
        (payload) =>
          payload.readyByGame["qa-lightning"].Sami && payload.readyByGame["qa-lightning"].Patryk
      );

      const startedPromise = waitForState(
        a,
        (payload) =>
          payload.activeGameId === "qa-lightning" && payload.activeGame?.phase === "in_round"
      );
      a.emit("game:start", { gameId: "qa-lightning" });
      await startedPromise;

      const revealPromise = waitForState(
        a,
        (payload) =>
          payload.activeGameId === "qa-lightning" && payload.activeGame?.phase === "reveal"
      );

      a.emit("game:action", { gameId: "qa-lightning", type: "submit", answerIndex: 0 });
      b.emit("game:action", { gameId: "qa-lightning", type: "submit", answerIndex: 0 });

      const revealState = await revealPromise;
      expect(revealState.activeGame?.gameId).toBe("qa-lightning");

      if (revealState.activeGame?.gameId !== "qa-lightning") {
        throw new Error("Brak stanu QA");
      }

      expect(revealState.activeGame.reveal?.matched).toBe(true);
      expect(revealState.activeGame.scores.Sami).toBe(1);
      expect(revealState.activeGame.scores.Patryk).toBe(1);
    },
    15000
  );

  it(
    "wysyła game:resume po reconnect",
    async () => {
      const dbPath = path.join(os.tmpdir(), `duoplay-game-${Date.now()}-resume.db`);
      const httpServer = http.createServer();

      const runtime: SocketRuntime = createSocketRuntime({
        httpServer,
        roomPin: "1234",
        heartbeatIntervalMs: 10000,
        sessionTtlMs: 30000,
        dbPath
      });

      await listenTestServer(httpServer);
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Brak portu testowego");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;

      resources.push(async () => runtime.close());
      resources.push(async () => closeHttpServer(httpServer));

      const a = createClient(baseUrl, { transports: ["websocket"] });
      const b = createClient(baseUrl, { transports: ["websocket"] });

      resources.push(async () => {
        a.disconnect();
      });
      resources.push(async () => {
        b.disconnect();
      });

      await waitForConnect(a);
      await waitForConnect(b);

      const authAPromise = waitForEvent(a, "auth:state");
      a.emit("auth:join", { pin: "1234", deviceId: "device-resume-a", desiredRole: "Sami" });
      await authAPromise;

      const authBPromise = waitForEvent(b, "auth:state");
      b.emit("auth:join", { pin: "1234", deviceId: "device-resume-b", desiredRole: "Patryk" });
      await authBPromise;

      a.emit("game:ready", { gameId: "qa-lightning", ready: true });
      b.emit("game:ready", { gameId: "qa-lightning", ready: true });

      await waitForState(
        a,
        (payload) =>
          payload.readyByGame["qa-lightning"].Sami && payload.readyByGame["qa-lightning"].Patryk
      );

      const startedPromise = waitForState(a, (payload) => payload.activeGameId === "qa-lightning");
      a.emit("game:start", { gameId: "qa-lightning" });
      await startedPromise;

      a.disconnect();

      const aReconnected = createClient(baseUrl, { transports: ["websocket"] });
      await waitForConnect(aReconnected);

      resources.push(async () => {
        aReconnected.disconnect();
      });

      const authReconnectPromise = waitForEvent<{ meRole?: string; ok: boolean }>(
        aReconnected,
        "auth:state"
      );
      const resumePromise = waitForEvent<{ state: GameStatusPayload }>(aReconnected, "game:resume");

      aReconnected.emit("auth:join", {
        pin: "1234",
        deviceId: "device-resume-a"
      });

      const auth = await authReconnectPromise;
      expect(auth.ok).toBe(true);
      expect(auth.meRole).toBe("Sami");

      const resume = await resumePromise;
      expect(resume.state.activeGameId).toBe("qa-lightning");
    },
    15000
  );

  it(
    "przerywa grę po zgodzie obu osób i zwraca wynik aborted",
    async () => {
      const dbPath = path.join(os.tmpdir(), `duoplay-game-${Date.now()}-abort.db`);
      const httpServer = http.createServer();

      const runtime: SocketRuntime = createSocketRuntime({
        httpServer,
        roomPin: "1234",
        heartbeatIntervalMs: 10000,
        sessionTtlMs: 30000,
        dbPath
      });

      await listenTestServer(httpServer);
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Brak portu testowego");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;
      resources.push(async () => runtime.close());
      resources.push(async () => closeHttpServer(httpServer));

      const a = createClient(baseUrl, { transports: ["websocket"] });
      const b = createClient(baseUrl, { transports: ["websocket"] });

      resources.push(async () => {
        a.disconnect();
      });
      resources.push(async () => {
        b.disconnect();
      });

      await waitForConnect(a);
      await waitForConnect(b);

      const authAPromise = waitForEvent(a, "auth:state");
      a.emit("auth:join", { pin: "1234", deviceId: "device-abort-a", desiredRole: "Sami" });
      await authAPromise;

      const authBPromise = waitForEvent(b, "auth:state");
      b.emit("auth:join", { pin: "1234", deviceId: "device-abort-b", desiredRole: "Patryk" });
      await authBPromise;

      a.emit("game:ready", { gameId: "qa-lightning", ready: true });
      b.emit("game:ready", { gameId: "qa-lightning", ready: true });

      await waitForState(
        a,
        (payload) =>
          payload.readyByGame["qa-lightning"].Sami && payload.readyByGame["qa-lightning"].Patryk
      );

      const startedPromise = waitForState(a, (payload) => payload.activeGameId === "qa-lightning");
      a.emit("game:start", { gameId: "qa-lightning" });
      await startedPromise;

      const endRequestStatePromise = waitForState(
        a,
        (payload) => Boolean(payload.activeGame && payload.activeGame.endRequest)
      );
      a.emit("game:action", { gameId: "qa-lightning", type: "request_end" });
      const endRequestState = await endRequestStatePromise;
      expect(endRequestState.activeGame?.endRequest?.requestedBy).toBe("Sami");

      const resultPromise = waitForEvent<{ endReason: string; summary: string }>(a, "game:result");
      const finishedStatePromise = waitForState(
        a,
        (payload) => payload.activeGame?.phase === "finished" && payload.latestResult?.endReason === "aborted"
      );
      b.emit("game:action", { gameId: "qa-lightning", type: "approve_end" });
      const result = await resultPromise;

      expect(result.endReason).toBe("aborted");
      expect(result.summary).toContain("Gra przerwana");

      const finishedState = await finishedStatePromise;
      expect(finishedState.activeGame?.winnerRole).toBeUndefined();
    },
    15000
  );

  it(
    "obsługuje konfigurację quizu kategorii i start science-quiz",
    async () => {
      const dbPath = path.join(os.tmpdir(), `duoplay-game-${Date.now()}-science.db`);
      const httpServer = http.createServer();

      const runtime: SocketRuntime = createSocketRuntime({
        httpServer,
        roomPin: "1234",
        heartbeatIntervalMs: 10000,
        sessionTtlMs: 30000,
        dbPath
      });

      await listenTestServer(httpServer);
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Brak portu testowego");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;
      resources.push(async () => runtime.close());
      resources.push(async () => closeHttpServer(httpServer));

      const a = createClient(baseUrl, { transports: ["websocket"] });
      const b = createClient(baseUrl, { transports: ["websocket"] });

      resources.push(async () => {
        a.disconnect();
      });
      resources.push(async () => {
        b.disconnect();
      });

      await waitForConnect(a);
      await waitForConnect(b);

      const authAPromise = waitForEvent(a, "auth:state");
      a.emit("auth:join", { pin: "1234", deviceId: "device-science-a", desiredRole: "Sami" });
      await authAPromise;

      const authBPromise = waitForEvent(b, "auth:state");
      b.emit("auth:join", { pin: "1234", deviceId: "device-science-b", desiredRole: "Patryk" });
      await authBPromise;

      a.emit("game:ready", { gameId: "science-quiz", ready: true });
      b.emit("game:ready", { gameId: "science-quiz", ready: true });

      await waitForState(
        a,
        (payload) =>
          payload.readyByGame["science-quiz"].Sami && payload.readyByGame["science-quiz"].Patryk
      );

      const rejectPromise = waitForEvent<{ code?: string }>(a, "error");
      a.emit("game:start", { gameId: "science-quiz" });
      const rejected = await rejectPromise;
      expect(rejected.code).toBe("GAME_START_REJECTED");

      a.emit("game:config", { gameId: "science-quiz", category: "geografia" });
      await waitForState(
        a,
        (payload) => payload.configByGame["science-quiz"]?.category === "geografia"
      );

      const startedPromise = waitForState(
        a,
        (payload) => payload.activeGameId === "science-quiz" && payload.activeGame?.phase === "in_round"
      );
      a.emit("game:start", { gameId: "science-quiz" });
      await startedPromise;
    },
    15000
  );

  it(
    "obu klientom pokazuje tego samego zwycięzcę po pełnej grze Better Half",
    async () => {
      const dbPath = path.join(os.tmpdir(), `duoplay-game-${Date.now()}-winner.db`);
      const httpServer = http.createServer();

      const runtime: SocketRuntime = createSocketRuntime({
        httpServer,
        roomPin: "1234",
        heartbeatIntervalMs: 10000,
        sessionTtlMs: 30000,
        dbPath
      });

      await listenTestServer(httpServer);
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Brak portu testowego");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;
      resources.push(async () => runtime.close());
      resources.push(async () => closeHttpServer(httpServer));

      const a = createClient(baseUrl, { transports: ["websocket"] });
      const b = createClient(baseUrl, { transports: ["websocket"] });

      resources.push(async () => {
        a.disconnect();
      });
      resources.push(async () => {
        b.disconnect();
      });

      await waitForConnect(a);
      await waitForConnect(b);

      const authAPromise = waitForEvent(a, "auth:state");
      a.emit("auth:join", { pin: "1234", deviceId: "device-winner-a", desiredRole: "Sami" });
      await authAPromise;

      const authBPromise = waitForEvent(b, "auth:state");
      b.emit("auth:join", { pin: "1234", deviceId: "device-winner-b", desiredRole: "Patryk" });
      await authBPromise;

      a.emit("game:ready", { gameId: "better-half", ready: true });
      b.emit("game:ready", { gameId: "better-half", ready: true });

      await waitForState(
        a,
        (payload) => payload.readyByGame["better-half"].Sami && payload.readyByGame["better-half"].Patryk
      );

      const startedPromise = waitForState(
        a,
        (payload) => payload.activeGameId === "better-half" && payload.activeGame?.phase === "in_round"
      );
      a.emit("game:start", { gameId: "better-half" });
      await startedPromise;

      for (let round = 1; round <= 10; round += 1) {
        const revealA = waitForState(
          a,
          (payload) =>
            payload.activeGameId === "better-half" &&
            payload.activeGame?.phase === "reveal" &&
            payload.activeGame.gameId === "better-half" &&
            payload.activeGame.reveal?.round === round
        );
        const revealB = waitForState(
          b,
          (payload) =>
            payload.activeGameId === "better-half" &&
            payload.activeGame?.phase === "reveal" &&
            payload.activeGame.gameId === "better-half" &&
            payload.activeGame.reveal?.round === round
        );

        a.emit("game:action", {
          gameId: "better-half",
          type: "submit",
          selfAnswerIndex: 1,
          guessPartnerIndex: 2
        });
        b.emit("game:action", {
          gameId: "better-half",
          type: "submit",
          selfAnswerIndex: 2,
          guessPartnerIndex: 0
        });

        const [stateA, stateB] = await Promise.all([revealA, revealB]);
        if (stateA.activeGame?.gameId !== "better-half" || stateB.activeGame?.gameId !== "better-half") {
          throw new Error("Brak stanu Better Half.");
        }

        expect(stateA.activeGame.scores.Sami).toBe(round);
        expect(stateA.activeGame.scores.Patryk).toBe(0);
        expect(stateB.activeGame.scores.Sami).toBe(round);
        expect(stateB.activeGame.scores.Patryk).toBe(0);

        if (round < 10) {
          const nextRoundA = waitForState(
            a,
            (payload) =>
              payload.activeGameId === "better-half" &&
              payload.activeGame?.phase === "in_round" &&
              payload.activeGame.gameId === "better-half" &&
              payload.activeGame.round === round + 1
          );
          const nextRoundB = waitForState(
            b,
            (payload) =>
              payload.activeGameId === "better-half" &&
              payload.activeGame?.phase === "in_round" &&
              payload.activeGame.gameId === "better-half" &&
              payload.activeGame.round === round + 1
          );
          a.emit("game:action", { gameId: "better-half", type: "advance" });
          await Promise.all([nextRoundA, nextRoundB]);
        }
      }

      const finishedA = waitForState(
        a,
        (payload) =>
          payload.activeGameId === "better-half" &&
          payload.activeGame?.phase === "finished" &&
          payload.activeGame.gameId === "better-half"
      );
      const finishedB = waitForState(
        b,
        (payload) =>
          payload.activeGameId === "better-half" &&
          payload.activeGame?.phase === "finished" &&
          payload.activeGame.gameId === "better-half"
      );
      const resultEvent = waitForEvent<{ winnerRole?: string; scores: { Sami: number; Patryk: number } }>(
        a,
        "game:result"
      );

      a.emit("game:action", { gameId: "better-half", type: "advance" });

      const [finalA, finalB, result] = await Promise.all([finishedA, finishedB, resultEvent]);
      if (finalA.activeGame?.gameId !== "better-half" || finalB.activeGame?.gameId !== "better-half") {
        throw new Error("Brak końcowego stanu Better Half.");
      }

      expect(finalA.activeGame.winnerRole).toBe("Sami");
      expect(finalB.activeGame.winnerRole).toBe("Sami");
      expect(result.winnerRole).toBe("Sami");
      expect(finalA.activeGame.scores).toEqual({ Sami: 10, Patryk: 0 });
      expect(finalB.activeGame.scores).toEqual({ Sami: 10, Patryk: 0 });
    },
    20000
  );
});
