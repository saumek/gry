import { describe, expect, it } from "vitest";

import {
  advanceBetterHalfState,
  createBetterHalfState,
  submitBetterHalfAnswer
} from "../../src/server/game/better-half-engine";
import {
  advanceCouplePrioritiesState,
  createCouplePrioritiesState,
  submitCouplePriorities
} from "../../src/server/game/couple-priorities-engine";
import {
  createBattleshipState,
  fireShot,
  placeShips
} from "../../src/server/game/battleship-engine";
import { createFireWaterState, moveFireWater } from "../../src/server/game/fire-water-coop-engine";
import { createQaState, submitQaAnswer, advanceQaState } from "../../src/server/game/qa-engine";
import {
  advanceScienceQuizState,
  createScienceQuizState,
  submitScienceAnswer
} from "../../src/server/game/science-quiz-engine";
import type {
  CouplePromptCard,
  QuestionCard,
  ScienceQuestionPrompt,
  ShipPlacement
} from "../../src/lib/types";

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

const scienceQuestion: ScienceQuestionPrompt & { correctIndex: number } = {
  id: 3,
  gameId: "science-quiz",
  category: "matma",
  text: "Ile to 2+2?",
  options: ["2", "3", "4", "5"],
  source: "builtin",
  correctIndex: 2
};

const couplePrompt: CouplePromptCard = {
  id: 4,
  gameId: "couple-priorities",
  text: "Co najważniejsze?",
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

  it("Science quiz liczy poprawne odpowiedzi i bonus za obie poprawne", () => {
    const state = createScienceQuizState(5, "matma", [scienceQuestion]);

    submitScienceAnswer(state, "Sami", 2);
    const outcome = submitScienceAnswer(state, "Patryk", 2);

    expect(outcome.roundReveal?.correctByRole.Sami).toBe(true);
    expect(outcome.roundReveal?.correctByRole.Patryk).toBe(true);
    expect(outcome.roundReveal?.bothCorrect).toBe(true);
    expect(state.scores.Sami).toBe(2);
    expect(state.scores.Patryk).toBe(2);

    const advanced = advanceScienceQuizState(state);
    expect(advanced.finished).toBe(true);
    expect(state.phase).toBe("finished");
  });

  it("Priorytety pary: waliduje ranking i nalicza punkty za zgodność + top-1", () => {
    const state = createCouplePrioritiesState(6, [couplePrompt]);

    const invalid = submitCouplePriorities(state, "Sami", [0, 0, 1, 2], 1);
    expect(invalid.changed).toBe(false);

    submitCouplePriorities(state, "Sami", [0, 1, 2, 3], 1);
    const outcome = submitCouplePriorities(state, "Patryk", [0, 2, 1, 3], 0);

    expect(outcome.roundReveal?.alignmentPoints).toBe(2);
    expect(outcome.roundReveal?.guessHits.Sami).toBe(false);
    expect(outcome.roundReveal?.guessHits.Patryk).toBe(true);
    expect(state.scores.Sami).toBe(2);
    expect(state.scores.Patryk).toBe(3);

    const advanced = advanceCouplePrioritiesState(state);
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

  it("Ogień i Woda: blokuje hazard i kończy level jako win/loss", () => {
    const state = createFireWaterState(7);
    state.turnRole = "Patryk";

    // Patryk nie może wejść na lawę (2,2).
    state.positions.Patryk = { x: 2, y: 1 };
    const hazardBlocked = moveFireWater(state, "Patryk", "down");
    expect(hazardBlocked.changed).toBe(true);
    expect(hazardBlocked.result).toBe("hazard_blocked");

    // Wymuś warunek zwycięstwa: oba klucze zebrane, Sami na wyjściu, Patryk dochodzi na wyjście.
    state.phase = "in_round";
    state.keysCollected.Sami = true;
    state.keysCollected.Patryk = true;
    state.positions.Sami = { x: 4, y: 2 };
    state.positions.Patryk = { x: 3, y: 2 };
    state.turnRole = "Patryk";

    const winMove = moveFireWater(state, "Patryk", "right");
    expect(winMove.changed).toBe(true);
    expect(winMove.result).toBe("win");
    expect(state.phase).toBe("finished");
    expect(state.outcome).toBe("win");

    // Osobny stan na porażkę limitem ruchów.
    const lossState = createFireWaterState(8);
    lossState.movesLimit = 1;
    lossState.turnRole = "Sami";
    lossState.positions.Sami = { x: 0, y: 4 };
    const lossMove = moveFireWater(lossState, "Sami", "left");
    expect(lossMove.changed).toBe(true);
    expect(lossState.phase).toBe("finished");
    expect(lossState.outcome).toBe("loss");
  });
});
