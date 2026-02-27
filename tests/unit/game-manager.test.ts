import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppDatabase } from "../../src/server/db";
import { GameManager } from "../../src/server/game/game-manager";

function createManager(prefix: string): { manager: GameManager; db: AppDatabase } {
  const dbPath = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random()}.db`);
  const db = new AppDatabase(dbPath);
  const manager = new GameManager(db);
  return { manager, db };
}

describe("game-manager early end", () => {
  const closers: Array<() => void> = [];

  afterEach(() => {
    for (const close of closers.splice(0, closers.length)) {
      close();
    }
  });

  it("kończy grę jako aborted po zgodzie obu osób", () => {
    const { manager, db } = createManager("duoplay-manager-abort");
    closers.push(() => db.close());

    manager.setReady("Sami", "qa-lightning", true);
    manager.setReady("Patryk", "qa-lightning", true);

    const start = manager.startGame("Sami", { gameId: "qa-lightning" }, {
      online: { Sami: true, Patryk: true },
      occupiedRoles: ["Sami", "Patryk"]
    });
    expect(start.ok).toBe(true);

    const request = manager.handleAction("Sami", { gameId: "qa-lightning", type: "request_end" });
    expect(request.ok).toBe(true);
    expect(request.event?.kind).toBe("end_requested");

    const approve = manager.handleAction("Patryk", {
      gameId: "qa-lightning",
      type: "approve_end"
    });
    expect(approve.ok).toBe(true);
    expect(approve.event?.kind).toBe("game_aborted");
    expect(approve.result?.endReason).toBe("aborted");
    expect(approve.result?.winnerRole).toBeUndefined();

    const state = manager.getStateFor("Sami");
    expect(state.activeGame?.phase).toBe("finished");
    expect(state.latestResult?.endReason).toBe("aborted");
    expect(state.history[0]?.status).toBe("aborted");
  });

  it("wygasza prośbę o zakończenie po timeout", () => {
    const { manager, db } = createManager("duoplay-manager-timeout");
    closers.push(() => db.close());

    manager.setReady("Sami", "qa-lightning", true);
    manager.setReady("Patryk", "qa-lightning", true);

    const start = manager.startGame("Sami", { gameId: "qa-lightning" }, {
      online: { Sami: true, Patryk: true },
      occupiedRoles: ["Sami", "Patryk"]
    });
    expect(start.ok).toBe(true);

    const request = manager.handleAction("Sami", { gameId: "qa-lightning", type: "request_end" });
    expect(request.ok).toBe(true);

    const stateBefore = manager.getStateFor("Sami");
    const expiresAt = stateBefore.activeGame?.endRequest?.expiresAt;
    expect(expiresAt).toBeDefined();

    const expiredEvent = manager.cleanupExpiredEndRequests(new Date(expiresAt as string).getTime() + 1);
    expect(expiredEvent?.kind).toBe("end_request_cancelled");

    const stateAfter = manager.getStateFor("Sami");
    expect(stateAfter.activeGame?.endRequest).toBeUndefined();
    expect(stateAfter.activeGame?.phase).toBe("in_round");
  });
});
