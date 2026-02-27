import http from "node:http";
import os from "node:os";
import path from "node:path";

import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

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

describe("socket runtime", () => {
  const resources: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const close of resources.reverse()) {
      await close();
    }
    resources.length = 0;
  });

  it("obsługuje przydział ról i gameplay bez eventów chat", async () => {
    const dbPath = path.join(os.tmpdir(), `duoplay-test-${Date.now()}.db`);
    const httpServer = http.createServer();

    const runtime: SocketRuntime = createSocketRuntime({
      httpServer,
      roomPin: "1234",
      heartbeatIntervalMs: 10000,
      sessionTtlMs: 30000,
      dbPath
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Nie udało się odczytać portu testowego");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    resources.push(async () => runtime.close());
    resources.push(async () => {
      await closeHttpServer(httpServer);
    });

    const clientA = createClient(baseUrl, { transports: ["websocket"] });
    const clientB = createClient(baseUrl, { transports: ["websocket"] });

    resources.push(async () => {
      clientA.disconnect();
    });
    resources.push(async () => {
      clientB.disconnect();
    });

    await waitForConnect(clientA);
    await waitForConnect(clientB);

    let chatEvents = 0;
    clientA.on("chat:new", () => {
      chatEvents += 1;
    });
    clientA.on("chat:history", () => {
      chatEvents += 1;
    });

    const choosePromise = waitForEvent<{
      requiresChoice: boolean;
      availableRoles: string[];
    }>(clientA, "auth:state");
    clientA.emit("auth:join", { pin: "1234", deviceId: "device-a" });
    const chooseA = await choosePromise;

    expect(chooseA.requiresChoice).toBe(true);
    expect(chooseA.availableRoles).toEqual(["Sami", "Patryk"]);

    const stateAPromise = waitForEvent<{ meRole?: string; ok: boolean }>(clientA, "auth:state");
    clientA.emit("auth:join", {
      pin: "1234",
      deviceId: "device-a",
      desiredRole: "Sami"
    });
    const stateA = await stateAPromise;
    expect(stateA.ok).toBe(true);
    expect(stateA.meRole).toBe("Sami");

    const stateBPromise = waitForEvent<{ meRole?: string; ok: boolean }>(clientB, "auth:state");
    clientB.emit("auth:join", { pin: "1234", deviceId: "device-b" });
    const stateB = await stateBPromise;
    expect(stateB.ok).toBe(true);
    expect(stateB.meRole).toBe("Patryk");

    clientA.emit("game:ready", { gameId: "qa-lightning", ready: true });
    clientB.emit("game:ready", { gameId: "qa-lightning", ready: true });

    const gameState = await waitForEvent<{ activeGameId: string | null }>(clientA, "game:state");
    expect(gameState).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(chatEvents).toBe(0);
  });

  it("zwraca roomFull dla trzeciego klienta", async () => {
    const dbPath = path.join(os.tmpdir(), `duoplay-test-${Date.now()}-2.db`);
    const httpServer = http.createServer();

    const runtime: SocketRuntime = createSocketRuntime({
      httpServer,
      roomPin: "1234",
      heartbeatIntervalMs: 10000,
      sessionTtlMs: 30000,
      dbPath
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Nie udało się odczytać portu testowego");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    resources.push(async () => runtime.close());
    resources.push(async () => {
      await closeHttpServer(httpServer);
    });

    const a = createClient(baseUrl, { transports: ["websocket"] });
    const b = createClient(baseUrl, { transports: ["websocket"] });
    const c = createClient(baseUrl, { transports: ["websocket"] });

    resources.push(async () => {
      a.disconnect();
    });
    resources.push(async () => {
      b.disconnect();
    });
    resources.push(async () => {
      c.disconnect();
    });

    await waitForConnect(a);
    await waitForConnect(b);
    await waitForConnect(c);

    const authAPromise = waitForEvent(a, "auth:state");
    a.emit("auth:join", { pin: "1234", deviceId: "device-aa", desiredRole: "Sami" });
    await authAPromise;

    const authBPromise = waitForEvent(b, "auth:state");
    b.emit("auth:join", { pin: "1234", deviceId: "device-bb", desiredRole: "Patryk" });
    await authBPromise;

    const stateCPromise = waitForEvent<{ ok: boolean; roomFull: boolean }>(c, "auth:state");
    c.emit("auth:join", { pin: "1234", deviceId: "device-cc" });
    const stateC = await stateCPromise;

    expect(stateC.ok).toBe(false);
    expect(stateC.roomFull).toBe(true);
  });

  it("aktywność game odświeża sesję i zapobiega przedwczesnemu timeoutowi roli", async () => {
    const dbPath = path.join(os.tmpdir(), `duoplay-test-${Date.now()}-ttl.db`);
    const httpServer = http.createServer();

    const runtime: SocketRuntime = createSocketRuntime({
      httpServer,
      roomPin: "1234",
      heartbeatIntervalMs: 10000,
      sessionTtlMs: 120,
      dbPath
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Nie udało się odczytać portu testowego");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    resources.push(async () => runtime.close());
    resources.push(async () => {
      await closeHttpServer(httpServer);
    });

    const a = createClient(baseUrl, { transports: ["websocket"] });
    const b = createClient(baseUrl, { transports: ["websocket"] });
    const c = createClient(baseUrl, { transports: ["websocket"] });

    resources.push(async () => {
      a.disconnect();
    });
    resources.push(async () => {
      b.disconnect();
    });
    resources.push(async () => {
      c.disconnect();
    });

    await waitForConnect(a);
    await waitForConnect(b);
    await waitForConnect(c);

    const authAPromise = waitForEvent(a, "auth:state");
    a.emit("auth:join", { pin: "1234", deviceId: "device-ttl-a", desiredRole: "Sami" });
    await authAPromise;

    const authBPromise = waitForEvent(b, "auth:state");
    b.emit("auth:join", { pin: "1234", deviceId: "device-ttl-b", desiredRole: "Patryk" });
    await authBPromise;

    await new Promise((resolve) => setTimeout(resolve, 80));
    a.emit("game:ready", { gameId: "qa-lightning", ready: true });
    await new Promise((resolve) => setTimeout(resolve, 70));

    const authCPromise = waitForEvent<{ ok: boolean; meRole?: string; requiresChoice: boolean }>(
      c,
      "auth:state"
    );
    c.emit("auth:join", { pin: "1234", deviceId: "device-ttl-c" });
    const authC = await authCPromise;

    expect(authC.ok).toBe(true);
    expect(authC.requiresChoice).toBe(false);
    expect(authC.meRole).toBe("Patryk");
  });
});
