import type {
  BetterHalfRoundReveal,
  CouplePrioritiesRoundReveal,
  GameScore,
  QaRoundReveal,
  Role,
  RoundBadgeModel,
  ScienceQuizRoundReveal,
  ScoreCardModel
} from "./types";
import { displayRoleName } from "./ui-state";

export function createScoreCards(scores: GameScore): ScoreCardModel[] {
  const delta = Math.abs(scores.Sami - scores.Patryk);

  return [
    {
      role: "Sami",
      points: scores.Sami,
      delta,
      lead: scores.Sami > scores.Patryk
    },
    {
      role: "Patryk",
      points: scores.Patryk,
      delta,
      lead: scores.Patryk > scores.Sami
    }
  ];
}

export function getLeader(scores: GameScore): Role | undefined {
  if (scores.Sami === scores.Patryk) {
    return undefined;
  }

  return scores.Sami > scores.Patryk ? "Sami" : "Patryk";
}

export function getLeadProgress(scores: GameScore): number {
  const total = scores.Sami + scores.Patryk;
  if (total === 0) {
    return 50;
  }

  const ratio = (scores.Sami / total) * 100;
  return Math.max(8, Math.min(92, ratio));
}

export function qaRevealBadges(reveal: QaRoundReveal): RoundBadgeModel[] {
  if (reveal.matched) {
    return [
      { icon: "✓", label: "Samuel: zgodność", tone: "success" },
      { icon: "✓", label: "Patryk: zgodność", tone: "success" }
    ];
  }

  return [
    { icon: "✕", label: "Samuel: brak zgodności", tone: "danger" },
    { icon: "✕", label: "Patryk: brak zgodności", tone: "danger" }
  ];
}

export function betterHalfRevealBadges(reveal: BetterHalfRoundReveal): RoundBadgeModel[] {
  return [
    {
      icon: reveal.hits.Sami ? "✓" : "✕",
      label: `Samuel: ${reveal.hits.Sami ? "trafione" : "nietrafione"}`,
      tone: reveal.hits.Sami ? "success" : "danger"
    },
    {
      icon: reveal.hits.Patryk ? "✓" : "✕",
      label: `Patryk: ${reveal.hits.Patryk ? "trafione" : "nietrafione"}`,
      tone: reveal.hits.Patryk ? "success" : "danger"
    }
  ];
}

export function scienceQuizRevealBadges(reveal: ScienceQuizRoundReveal): RoundBadgeModel[] {
  const badges: RoundBadgeModel[] = [
    {
      icon: reveal.correctByRole.Sami ? "✓" : "✕",
      label: `Samuel: ${reveal.correctByRole.Sami ? "poprawnie" : "błędnie"}`,
      tone: reveal.correctByRole.Sami ? "success" : "danger"
    },
    {
      icon: reveal.correctByRole.Patryk ? "✓" : "✕",
      label: `Patryk: ${reveal.correctByRole.Patryk ? "poprawnie" : "błędnie"}`,
      tone: reveal.correctByRole.Patryk ? "success" : "danger"
    }
  ];

  if (reveal.bothCorrect) {
    badges.push({
      icon: "★",
      label: "Bonus: obie poprawne",
      tone: "info"
    });
  }

  return badges;
}

export function couplePrioritiesRevealBadges(
  reveal: CouplePrioritiesRoundReveal
): RoundBadgeModel[] {
  return [
    {
      icon: "≈",
      label: `Zgodność pozycji: ${reveal.alignmentPoints}/4`,
      tone: reveal.alignmentPoints >= 2 ? "success" : "warning"
    },
    {
      icon: reveal.guessHits.Sami ? "✓" : "✕",
      label: `Samuel top-1: ${reveal.guessHits.Sami ? "trafione" : "nietrafione"}`,
      tone: reveal.guessHits.Sami ? "success" : "danger"
    },
    {
      icon: reveal.guessHits.Patryk ? "✓" : "✕",
      label: `Patryk top-1: ${reveal.guessHits.Patryk ? "trafione" : "nietrafione"}`,
      tone: reveal.guessHits.Patryk ? "success" : "danger"
    }
  ];
}

export function winnerBadge(scores: GameScore, winnerRole?: Role): RoundBadgeModel {
  if (!winnerRole) {
    return {
      icon: "≈",
      label: "Remis",
      tone: "neutral"
    };
  }

  return {
    icon: "★",
    label: `Wygrana: ${displayRoleName(winnerRole)}`,
    tone: "info"
  };
}
