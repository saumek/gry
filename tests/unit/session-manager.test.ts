import { describe, expect, it } from "vitest";

import { SessionManager } from "../../src/server/session/session-manager";

describe("SessionManager", () => {
  it("wymaga wyboru roli, gdy obie są wolne", () => {
    const manager = new SessionManager(30000);

    const result = manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      now: 1000
    });

    expect(result.ok).toBe(true);
    expect(result.requiresChoice).toBe(true);
    expect(result.availableRoles).toEqual(["Sami", "Patryk"]);
  });

  it("automatycznie przydziela drugą rolę, gdy jedna jest zajęta", () => {
    const manager = new SessionManager(30000);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      desiredRole: "Sami",
      now: 1000
    });

    const second = manager.join({
      deviceId: "device-b",
      socketId: "socket-b",
      now: 2000
    });

    expect(second.ok).toBe(true);
    expect(second.meRole).toBe("Patryk");
    expect(second.requiresChoice).toBe(false);
  });

  it("zwraca pełny pokój, gdy obie role są zajęte", () => {
    const manager = new SessionManager(30000);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      desiredRole: "Sami",
      now: 1000
    });
    manager.join({
      deviceId: "device-b",
      socketId: "socket-b",
      desiredRole: "Patryk",
      now: 2000
    });

    const result = manager.join({
      deviceId: "device-c",
      socketId: "socket-c",
      now: 2500
    });

    expect(result.ok).toBe(false);
    expect(result.roomFull).toBe(true);
  });

  it("zwalnia rolę po timeout i umożliwia ponowne wejście", () => {
    const manager = new SessionManager(30000);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      desiredRole: "Sami",
      now: 1000
    });

    manager.disconnect("socket-a", 1500);
    manager.cleanupExpired(32001);

    const result = manager.join({
      deviceId: "device-b",
      socketId: "socket-b",
      desiredRole: "Sami",
      now: 32010
    });

    expect(result.ok).toBe(true);
    expect(result.meRole).toBe("Sami");
  });

  it("odtwarza tę samą rolę po reconnect z tym samym deviceId", () => {
    const manager = new SessionManager(30000);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      desiredRole: "Patryk",
      now: 1000
    });

    manager.disconnect("socket-a", 5000);

    const reconnect = manager.join({
      deviceId: "device-a",
      socketId: "socket-new",
      now: 6000
    });

    expect(reconnect.ok).toBe(true);
    expect(reconnect.meRole).toBe("Patryk");
    expect(reconnect.requiresChoice).toBe(false);
  });

  it("revision presence rośnie tylko przy realnej zmianie online/occupied", () => {
    const manager = new SessionManager(100);
    expect(manager.getPresenceRevision()).toBe(0);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      now: 1000
    });
    expect(manager.getPresenceRevision()).toBe(0);

    manager.join({
      deviceId: "device-a",
      socketId: "socket-a",
      desiredRole: "Sami",
      now: 1001
    });
    expect(manager.getPresenceRevision()).toBe(1);

    manager.ping("socket-a", 1010);
    expect(manager.getPresenceRevision()).toBe(1);

    manager.disconnect("socket-a", 1020);
    expect(manager.getPresenceRevision()).toBe(2);

    manager.cleanupExpired(1050);
    expect(manager.getPresenceRevision()).toBe(2);

    manager.cleanupExpired(1201);
    expect(manager.getPresenceRevision()).toBe(3);
  });
});
