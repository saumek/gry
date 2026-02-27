import { describe, expect, it } from "vitest";

import { submitBetterHalfAnswer, createBetterHalfState, advanceBetterHalfState } from "../../src/server/game/better-half-engine";
import { createBattleshipState, fireShot, placeShips } from "../../src/server/game/battleship-engine";
import { createQaState, submitQaAnswer, advanceQaState } from "../../src/server/game/qa-engine";
import type { QuestionCard, ShipPlacement } from "../../src/lib/types";

const qaQuestion: QuestionCard = {
  id: 1,
  gameId: "qa-lightning",
  text: "Test",
  options: ["A", "B", "C", "D"],
  source: "builtin"
};

const betterQuestion: QuestionCard = {
  id: 2,
  gameId: "better-half",
  text: "Test2",
  options: ["A", "B", "C", "D"],
  source: "builtin"
};

describe("game engines", () => {
  it("QA przyznaje punkty tylko przy zgodności odpowiedzi", () => {
    const state = createQaState(1, [qaQuestion]);

    submitQaAnswer(state, "Sami", 0);
    const outcome = submitQaAnswer(state, "Patryk", 0);

    expect(outcome.roundReveal?.matched).toBe(true);
    expect(state.scores.Sami).toBe(1);
    expect(state.scores.Patryk).toBe(1);

    const advanced = advanceQaState(state);
    expect(advanced.finished).toBe(true);
    expect(state.phase).toBe("finished");
  });

  it("Better-half daje punkt za trafne typowanie odpowiedzi partnera", () => {
    const state = createBetterHalfState(2, [betterQuestion]);

    submitBetterHalfAnswer(state, "Sami", 1, 2);
    const outcome = submitBetterHalfAnswer(state, "Patryk", 2, 0);

    expect(outcome.roundReveal?.hits.Sami).toBe(true);
    expect(outcome.roundReveal?.hits.Patryk).toBe(false);
    expect(state.scores.Sami).toBe(1);
    expect(state.scores.Patryk).toBe(0);

    const advanced = advanceBetterHalfState(state);
    expect(advanced.finished).toBe(true);
    expect(state.phase).toBe("finished");
  });

  it("Statki walidują setup i pozwalają wygrać po zatopieniu wszystkich pól", () => {
    const state = createBattleshipState(3);

    const samiPlacements: ShipPlacement[] = [
      { x: 0, y: 0, length: 3, orientation: "H" },
      { x: 0, y: 2, length: 2, orientation: "H" },
      { x: 0, y: 4, length: 2, orientation: "H" }
    ];

    const patrykPlacements: ShipPlacement[] = [
      { x: 1, y: 0, length: 3, orientation: "H" },
      { x: 1, y: 2, length: 2, orientation: "H" },
      { x: 1, y: 4, length: 2, orientation: "H" }
    ];

    expect(placeShips(state, "Sami", samiPlacements).changed).toBe(true);
    expect(placeShips(state, "Patryk", patrykPlacements).changed).toBe(true);
    expect(state.phase).toBe("in_round");

    // Wymuś kolejność tur do testu deterministycznie.
    state.turnRole = "Sami";

    const cells = [
      [1, 0],
      [2, 0],
      [3, 0],
      [1, 2],
      [2, 2],
      [1, 4],
      [2, 4]
    ] as const;

    for (const [x, y] of cells) {
      const shot = fireShot(state, "Sami", x, y);
      expect(shot.changed).toBe(true);
      if (state.phase === "finished") {
        break;
      }
      state.turnRole = "Sami";
    }

    expect(state.phase).toBe("finished");
    expect(state.winnerRole).toBe("Sami");
  });
});
