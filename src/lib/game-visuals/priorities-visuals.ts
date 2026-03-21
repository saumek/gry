import type {
  CouplePrioritiesGameState,
  CouplePrioritiesRoundReveal,
  GameRoundVisualState,
  ResultHeroModel,
  RoundTimelineItem
} from "../types";

export function createPrioritiesRoundVisual(
  reveal: CouplePrioritiesRoundReveal
): GameRoundVisualState {
  const totalRound = reveal.roundPoints.Sami + reveal.roundPoints.Patryk;
  const tone = totalRound >= 6 ? "success" : totalRound >= 3 ? "warning" : "danger";

  return {
    title: "Zgodność priorytetów",
    subtitle: reveal.prompt.text,
    tone,
    icon: totalRound >= 6 ? "🤝" : "📊",
    decisions: [
      {
        actor: "Sami",
        title: "Ranking Sami",
        choice: formatRanking(reveal.submissions.Sami.ranking, reveal.prompt.options),
        tone: "info",
        icon: "S",
        detail: `Typ top-1 partnera: ${reveal.prompt.options[reveal.submissions.Sami.guessPartnerTop]}`
      },
      {
        actor: "Patryk",
        title: "Ranking Patryka",
        choice: formatRanking(reveal.submissions.Patryk.ranking, reveal.prompt.options),
        tone: "info",
        icon: "P",
        detail: `Typ top-1 partnera: ${reveal.prompt.options[reveal.submissions.Patryk.guessPartnerTop]}`
      }
    ],
    points: [
      {
        label: "Zgodność pozycji",
        value: `+${reveal.alignmentPoints} dla obu`,
        tone: reveal.alignmentPoints >= 2 ? "success" : reveal.alignmentPoints === 1 ? "warning" : "danger",
        icon: "≈",
        detail: `${reveal.alignmentPoints} zgodne pozycje z 4 w obu rankingach`
      },
      {
        label: "Sami · trafienie top-1",
        value: reveal.guessHits.Sami ? "+1" : "+0",
        tone: reveal.guessHits.Sami ? "success" : "danger",
        icon: reveal.guessHits.Sami ? "✓" : "✕",
        detail: `Patryk dał na #1: ${reveal.prompt.options[reveal.submissions.Patryk.ranking[0]]}`
      },
      {
        label: "Patryk · trafienie top-1",
        value: reveal.guessHits.Patryk ? "+1" : "+0",
        tone: reveal.guessHits.Patryk ? "success" : "danger",
        icon: reveal.guessHits.Patryk ? "✓" : "✕",
        detail: `Sami dał na #1: ${reveal.prompt.options[reveal.submissions.Sami.ranking[0]]}`
      }
    ]
  };
}

export function createPrioritiesTimeline(history: CouplePrioritiesRoundReveal[]): RoundTimelineItem[] {
  return history.map((item) => {
    const points = item.roundPoints.Sami + item.roundPoints.Patryk;
    return {
      round: item.round,
      label: `${points} pkt łącznie`,
      tone: points >= 6 ? "success" : points >= 3 ? "warning" : "danger"
    };
  });
}

export function createPrioritiesResultHero(state: CouplePrioritiesGameState): ResultHeroModel {
  return {
    title: state.winnerRole ? `Wygrywa ${state.winnerRole}` : "Remis",
    subtitle: "Zgranie rankingów i trafienie top-1 partnera",
    tone: state.winnerRole ? "info" : "neutral",
    icon: state.winnerRole ? "🏆" : "≈",
    stats: [
      { label: "Sami", value: String(state.scores.Sami) },
      { label: "Patryk", value: String(state.scores.Patryk) },
      { label: "Rundy", value: `${state.history.length}/${state.totalRounds}` }
    ]
  };
}

function formatRanking(
  ranking: [number, number, number, number],
  options: [string, string, string, string]
): string {
  return ranking.map((optionIndex, index) => `${index + 1}. ${options[optionIndex]}`).join(" / ");
}
