import type {
  GameRoundVisualState,
  QaGameState,
  QaRoundReveal,
  ResultHeroModel,
  RoundTimelineItem
} from "../types";
import { displayRoleName } from "../ui-state";

export function createQaRoundVisual(reveal: QaRoundReveal): GameRoundVisualState {
  const tone = reveal.matched ? "success" : "danger";
  const roundPoints = reveal.matched ? "+1 / +1" : "+0 / +0";

  return {
    title: reveal.matched ? "Zgodność odpowiedzi" : "Różne odpowiedzi",
    subtitle: reveal.question.text,
    tone,
    icon: reveal.matched ? "✨" : "↔",
    decisions: [
      {
        actor: "Sami",
        title: "Wybór Samuela",
        choice: reveal.question.options[reveal.answers.Sami],
        tone,
        icon: "S"
      },
      {
        actor: "Patryk",
        title: "Wybór Patryka",
        choice: reveal.question.options[reveal.answers.Patryk],
        tone,
        icon: "P"
      }
    ],
    points: [
      {
        label: "Punkty rundy",
        value: roundPoints,
        tone,
        icon: reveal.matched ? "✓" : "✕",
        detail: reveal.matched ? "Obie odpowiedzi były identyczne" : "Odpowiedzi nie były zgodne"
      }
    ]
  };
}

export function createQaTimeline(history: QaRoundReveal[]): RoundTimelineItem[] {
  return history.map((item) => ({
    round: item.round,
    label: item.matched ? "Zgodność" : "Brak zgodności",
    tone: item.matched ? "success" : "danger"
  }));
}

export function createQaResultHero(state: QaGameState): ResultHeroModel {
  const winnerTitle = state.winnerRole ? `Wygrywa ${displayRoleName(state.winnerRole)}` : "Remis";

  return {
    title: winnerTitle,
    subtitle: "Podsumowanie 10 rund Q&A",
    tone: state.winnerRole ? "info" : "neutral",
    icon: state.winnerRole ? "🏆" : "≈",
    stats: [
      { label: "Samuel", value: String(state.scores.Sami) },
      { label: "Patryk", value: String(state.scores.Patryk) },
      { label: "Rundy", value: `${state.history.length}/${state.totalRounds}` }
    ]
  };
}
