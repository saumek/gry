import { describe, expect, it } from "vitest";

import {
  createClientActionId,
  questionGameNeedsPeer,
  shouldResolveByEventKind
} from "../../src/lib/action-feedback";

describe("action feedback", () => {
  it("generuje clientActionId zgodne z formatem walidacji", () => {
    const id = createClientActionId("game_action");
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("rozpoznaje akcje wymagające oczekiwania na partnera", () => {
    expect(
      questionGameNeedsPeer({
        gameId: "qa-lightning",
        type: "submit",
        answerIndex: 1
      })
    ).toBe(true);

    expect(
      questionGameNeedsPeer({
        gameId: "mini-battleship",
        type: "fire",
        x: 0,
        y: 0
      })
    ).toBe(false);
  });

  it("mapuje eventy na finalizację feedbacku dla submit/advance", () => {
    const submitPayload = {
      gameId: "science-quiz" as const,
      type: "submit" as const,
      answerIndex: 2
    };
    const advancePayload = {
      gameId: "science-quiz" as const,
      type: "advance" as const
    };

    expect(shouldResolveByEventKind("round_revealed", submitPayload)).toBe(true);
    expect(shouldResolveByEventKind("round_advanced", submitPayload)).toBe(true);
    expect(shouldResolveByEventKind("round_advanced", advancePayload)).toBe(true);
  });
});
