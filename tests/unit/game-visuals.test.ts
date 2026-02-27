import { describe, expect, it } from "vitest";

import { createBetterHalfRoundVisual } from "../../src/lib/game-visuals/better-half-visuals";
import { createPrioritiesRoundVisual } from "../../src/lib/game-visuals/priorities-visuals";
import { createQaRoundVisual } from "../../src/lib/game-visuals/qa-visuals";
import { createScienceRoundVisual } from "../../src/lib/game-visuals/science-visuals";
import type {
  BetterHalfRoundReveal,
  CouplePrioritiesRoundReveal,
  QaRoundReveal,
  ScienceQuizRoundReveal
} from "../../src/lib/types";

describe("game-visual mappers", () => {
  it("mapuje Q&A reveal na visual z punktami rundy", () => {
    const reveal: QaRoundReveal = {
      round: 1,
      question: {
        id: 1,
        gameId: "qa-lightning",
        text: "Ulubiony dzień tygodnia?",
        options: ["Pn", "Wt", "Sob", "Nd"],
        source: "builtin"
      },
      answers: { Sami: 2, Patryk: 2 },
      matched: true,
      scores: { Sami: 1, Patryk: 1 }
    };

    const visual = createQaRoundVisual(reveal);
    expect(visual.tone).toBe("success");
    expect(visual.decisions).toHaveLength(2);
    expect(visual.points[0].value).toBe("+1 / +1");
  });

  it("mapuje Druga Połówka reveal na 4 decyzje matrix", () => {
    const reveal: BetterHalfRoundReveal = {
      round: 2,
      question: {
        id: 2,
        gameId: "better-half",
        text: "Wieczór idealny?",
        options: ["Kino", "Dom", "Spacer", "Kolacja"],
        source: "builtin"
      },
      answers: {
        Sami: { selfAnswer: 1, guessPartner: 0 },
        Patryk: { selfAnswer: 0, guessPartner: 1 }
      },
      hits: { Sami: true, Patryk: false },
      scores: { Sami: 2, Patryk: 1 }
    };

    const visual = createBetterHalfRoundVisual(reveal);
    expect(visual.decisions).toHaveLength(4);
    expect(visual.points.map((item) => item.value)).toEqual(["+1", "+0"]);
  });

  it("mapuje Science Quiz reveal z poprawną odpowiedzią i bonusem", () => {
    const reveal: ScienceQuizRoundReveal = {
      round: 1,
      question: {
        id: 3,
        gameId: "science-quiz",
        category: "nauka",
        text: "H2O to?",
        options: ["Woda", "Tlen", "Wodór", "Sól"],
        source: "builtin"
      },
      answers: { Sami: 0, Patryk: 2 },
      correctIndex: 0,
      correctByRole: { Sami: true, Patryk: false },
      bothCorrect: false,
      scores: { Sami: 1, Patryk: 0 }
    };

    const visual = createScienceRoundVisual(reveal);
    expect(visual.decisions[0].choice).toBe("Woda");
    expect(visual.points[0].value).toBe("+1");
    expect(visual.points[1].value).toBe("+0");
    expect(visual.points[2].value).toBe("+0/+0");
  });

  it("mapuje Priorytety na alignment + top-1 breakdown", () => {
    const reveal: CouplePrioritiesRoundReveal = {
      round: 3,
      prompt: {
        id: 4,
        gameId: "couple-priorities",
        text: "Weekend idealny",
        options: ["Podróż", "Film", "Restauracja", "Spacer"],
        source: "builtin"
      },
      submissions: {
        Sami: { ranking: [0, 1, 2, 3], guessPartnerTop: 0 },
        Patryk: { ranking: [0, 2, 1, 3], guessPartnerTop: 0 }
      },
      alignmentPoints: 2,
      guessHits: { Sami: true, Patryk: true },
      roundPoints: { Sami: 3, Patryk: 3 },
      scores: { Sami: 6, Patryk: 4 }
    };

    const visual = createPrioritiesRoundVisual(reveal);
    expect(visual.decisions).toHaveLength(2);
    expect(visual.points[0].value).toContain("2/4");
    expect(visual.points[1].value).toBe("+1");
    expect(visual.points[2].value).toBe("+1");
  });
});
