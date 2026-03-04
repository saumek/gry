import { describe, expect, it } from "vitest";

import type { AppDatabase } from "../../src/server/db";
import { selectQuestions } from "../../src/server/game/question-selector";

function createRelationCandidate(id: number) {
  return {
    id,
    gameId: "qa-lightning" as const,
    text: `Pytanie ${id}`,
    options: [`A${id}`, `B${id}`, `C${id}`, `D${id}`] as [string, string, string, string],
    source: "builtin" as const
  };
}

describe("question selector", () => {
  it("respektuje anti-repeat dla okna 12 sesji, gdy pula na to pozwala", () => {
    const candidates = [createRelationCandidate(1), createRelationCandidate(2), createRelationCandidate(3)];
    const db = {
      listQuestionCandidates: () => candidates,
      listScienceQuestionCandidates: () => [],
      listPriorityPromptCandidates: () => [],
      listRecentExposedQuestionIds: (_gameId: string, _category: string | null, window: number) =>
        window >= 12 ? [1, 2] : [],
      listQuestionStats: () => []
    } as unknown as AppDatabase;

    const selected = selectQuestions({
      db,
      gameId: "qa-lightning",
      count: 1,
      recentSessionsWindow: 12
    });

    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe(3);
    expect(selected[0].smartMeta?.repeatRisk).toBe("low");
  });

  it("schodzi do fallback window=6 i oznacza repeatRisk=medium", () => {
    const candidates = [createRelationCandidate(1), createRelationCandidate(2), createRelationCandidate(3)];
    const db = {
      listQuestionCandidates: () => candidates,
      listScienceQuestionCandidates: () => [],
      listPriorityPromptCandidates: () => [],
      listRecentExposedQuestionIds: (_gameId: string, _category: string | null, window: number) => {
        if (window >= 12) {
          return [1, 2, 3];
        }
        if (window >= 6) {
          return [1];
        }
        return [];
      },
      listQuestionStats: () => []
    } as unknown as AppDatabase;

    const selected = selectQuestions({
      db,
      gameId: "qa-lightning",
      count: 2,
      recentSessionsWindow: 12
    });

    expect(selected.map((entry) => entry.id)).toEqual([2, 3]);
    expect(selected.every((entry) => entry.smartMeta?.repeatRisk === "medium")).toBe(true);
  });

  it("oznacza repeatRisk=fallback, gdy trzeba zejść do window=0", () => {
    const candidates = [createRelationCandidate(1), createRelationCandidate(2)];
    const db = {
      listQuestionCandidates: () => candidates,
      listScienceQuestionCandidates: () => [],
      listPriorityPromptCandidates: () => [],
      listRecentExposedQuestionIds: (_gameId: string, _category: string | null, window: number) =>
        window > 0 ? [1, 2] : [],
      listQuestionStats: () => []
    } as unknown as AppDatabase;

    const selected = selectQuestions({
      db,
      gameId: "qa-lightning",
      count: 2,
      recentSessionsWindow: 12
    });

    expect(selected).toHaveLength(2);
    expect(selected.every((entry) => entry.smartMeta?.repeatRisk === "fallback")).toBe(true);
  });
});
