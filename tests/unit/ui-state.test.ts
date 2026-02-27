import { describe, expect, it } from "vitest";

import { createTopBarModel, resolveTab } from "../../src/lib/ui-state";
import type { QaGameState } from "../../src/lib/types";

function createQaState(phase: QaGameState["phase"]): QaGameState {
  return {
    gameId: "qa-lightning",
    sessionId: 1,
    phase,
    ready: { Sami: true, Patryk: true },
    totalRounds: 10,
    round: 2,
    scores: { Sami: 3, Patryk: 1 },
    submittedRoles: [],
    history: [],
    rematchVotes: []
  };
}

describe("ui-state", () => {
  it("buduje model top bara dla lobby bez aktywnej gry", () => {
    const model = createTopBarModel("Sami", null, "online", "Online");

    expect(model.roleLabel).toBe("Ty: Sami");
    expect(model.connectionStatus).toBe("online");
    expect(model.gameLabel).toBe("Brak aktywnej gry");
    expect(model.jumpToResult).toBe(false);
  });

  it("buduje model top bara dla aktywnej gry i wyniku", () => {
    const inRound = createTopBarModel("Patryk", createQaState("in_round"), "online", "Online");
    expect(inRound.gameLabel).toBe("Q&A");
    expect(inRound.phaseLabel).toBe("Runda");
    expect(inRound.scoreLabel).toBe("3:1");
    expect(inRound.jumpToResult).toBe(false);

    const finished = createTopBarModel("Patryk", createQaState("finished"), "online", "Online");
    expect(finished.phaseLabel).toBe("Wynik");
    expect(finished.jumpToResult).toBe(true);
  });

  it("przełącza aktywną zakładkę zgodnie ze stanem gry", () => {
    expect(resolveTab("lobby", true)).toBe("game");
    expect(resolveTab("game", false)).toBe("lobby");
    expect(resolveTab("history", false)).toBe("history");
  });
});
