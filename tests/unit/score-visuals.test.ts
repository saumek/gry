import { describe, expect, it } from "vitest";

import {
  betterHalfRevealBadges,
  createScoreCards,
  getLeadProgress,
  getLeader,
  qaRevealBadges,
  winnerBadge
} from "../../src/lib/score-visuals";
import type { BetterHalfRoundReveal, QaRoundReveal } from "../../src/lib/types";

const qaQuestion = {
  id: 1,
  gameId: "qa-lightning" as const,
  text: "Ulubiony kolor?",
  options: ["Niebieski", "Czerwony", "Zielony", "Czarny"] as [string, string, string, string],
  source: "builtin" as const
};

describe("score-visuals", () => {
  it("buduje karty punktowe i lidera", () => {
    const cards = createScoreCards({ Sami: 4, Patryk: 2 });
    expect(cards[0]).toMatchObject({ role: "Sami", points: 4, delta: 2, lead: true });
    expect(cards[1]).toMatchObject({ role: "Patryk", points: 2, delta: 2, lead: false });
    expect(getLeader({ Sami: 4, Patryk: 2 })).toBe("Sami");
  });

  it("liczy pasek przewagi i daje 50% dla zera", () => {
    expect(getLeadProgress({ Sami: 0, Patryk: 0 })).toBe(50);
    expect(getLeadProgress({ Sami: 3, Patryk: 1 })).toBeGreaterThan(50);
    expect(getLeadProgress({ Sami: 1, Patryk: 3 })).toBeLessThan(50);
  });

  it("mapuje reveal Q&A na badge sukcesu/porażki", () => {
    const matchedReveal: QaRoundReveal = {
      round: 1,
      question: qaQuestion,
      answers: { Sami: 0, Patryk: 0 },
      matched: true,
      scores: { Sami: 1, Patryk: 1 }
    };
    const missedReveal: QaRoundReveal = {
      ...matchedReveal,
      matched: false,
      answers: { Sami: 1, Patryk: 2 }
    };

    const matchedBadges = qaRevealBadges(matchedReveal);
    const missedBadges = qaRevealBadges(missedReveal);

    expect(matchedBadges.every((badge) => badge.tone === "success")).toBe(true);
    expect(missedBadges.every((badge) => badge.tone === "danger")).toBe(true);
  });

  it("mapuje reveal Druga Połówka na osobne badge trafienia", () => {
    const reveal: BetterHalfRoundReveal = {
      round: 1,
      question: {
        id: 2,
        gameId: "better-half",
        text: "Wybór filmu?",
        options: ["A", "B", "C", "D"],
        source: "builtin"
      },
      answers: {
        Sami: { selfAnswer: 0, guessPartner: 1 },
        Patryk: { selfAnswer: 1, guessPartner: 2 }
      },
      hits: { Sami: true, Patryk: false },
      scores: { Sami: 1, Patryk: 0 }
    };

    const badges = betterHalfRevealBadges(reveal);
    expect(badges[0].tone).toBe("success");
    expect(badges[1].tone).toBe("danger");
  });

  it("buduje badge zwycięzcy lub remisu", () => {
    expect(winnerBadge({ Sami: 2, Patryk: 2 }).tone).toBe("neutral");
    expect(winnerBadge({ Sami: 3, Patryk: 1 }, "Sami")).toMatchObject({
      icon: "★",
      tone: "info"
    });
  });
});
