import type {
  BetterHalfRoundReveal,
  GameScore,
  QaRoundReveal,
  Role,
  RoundBadgeModel,
  ScoreCardModel
} from "./types";

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
      { icon: "✓", label: "Sami: zgodność", tone: "success" },
      { icon: "✓", label: "Patryk: zgodność", tone: "success" }
    ];
  }

  return [
    { icon: "✕", label: "Sami: brak zgodności", tone: "danger" },
    { icon: "✕", label: "Patryk: brak zgodności", tone: "danger" }
  ];
}

export function betterHalfRevealBadges(reveal: BetterHalfRoundReveal): RoundBadgeModel[] {
  return [
    {
      icon: reveal.hits.Sami ? "✓" : "✕",
      label: `Sami: ${reveal.hits.Sami ? "trafione" : "nietrafione"}`,
      tone: reveal.hits.Sami ? "success" : "danger"
    },
    {
      icon: reveal.hits.Patryk ? "✓" : "✕",
      label: `Patryk: ${reveal.hits.Patryk ? "trafione" : "nietrafione"}`,
      tone: reveal.hits.Patryk ? "success" : "danger"
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
    label: `Wygrana: ${winnerRole}`,
    tone: "info"
  };
}
