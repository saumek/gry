import type {
  BetterHalfGameState,
  BetterHalfRoundReveal,
  GameRoundVisualState,
  ResultHeroModel,
  RoundTimelineItem
} from "../types";
import { displayRoleName } from "../ui-state";

export function createBetterHalfRoundVisual(reveal: BetterHalfRoundReveal): GameRoundVisualState {
  const hitsCount = Number(reveal.hits.Sami) + Number(reveal.hits.Patryk);
  const tone = hitsCount === 2 ? "success" : hitsCount === 0 ? "danger" : "warning";

  return {
    title: "Reveal: odpowiedzi i typy",
    subtitle: reveal.question.text,
    tone,
    icon: hitsCount === 2 ? "💘" : "🧩",
    decisions: [
      {
        actor: "Sami",
        title: "Samuel · odpowiedź",
        choice: reveal.question.options[reveal.answers.Sami.selfAnswer],
        tone: "info",
        icon: "S",
        detail: `Typ partnera: ${reveal.question.options[reveal.answers.Sami.guessPartner]}`
      },
      {
        actor: "Patryk",
        title: "Patryk · odpowiedź",
        choice: reveal.question.options[reveal.answers.Patryk.selfAnswer],
        tone: "info",
        icon: "P",
        detail: `Typ partnera: ${reveal.question.options[reveal.answers.Patryk.guessPartner]}`
      },
      {
        actor: "Sami",
        title: "Samuel · trafienie",
        choice: reveal.hits.Sami ? "Trafione" : "Nietrafione",
        tone: reveal.hits.Sami ? "success" : "danger",
        icon: reveal.hits.Sami ? "✓" : "✕"
      },
      {
        actor: "Patryk",
        title: "Patryk · trafienie",
        choice: reveal.hits.Patryk ? "Trafione" : "Nietrafione",
        tone: reveal.hits.Patryk ? "success" : "danger",
        icon: reveal.hits.Patryk ? "✓" : "✕"
      }
    ],
    points: [
      {
        label: "Punkty Samuel",
        value: reveal.hits.Sami ? "+1" : "+0",
        tone: reveal.hits.Sami ? "success" : "danger",
        icon: reveal.hits.Sami ? "✓" : "✕",
        detail: reveal.hits.Sami
          ? "Samuel dobrze przewidział odpowiedź Patryka"
          : "Samuel nie trafił odpowiedzi Patryka"
      },
      {
        label: "Punkty Patryk",
        value: reveal.hits.Patryk ? "+1" : "+0",
        tone: reveal.hits.Patryk ? "success" : "danger",
        icon: reveal.hits.Patryk ? "✓" : "✕",
        detail: reveal.hits.Patryk
          ? "Patryk dobrze przewidział odpowiedź Samuela"
          : "Patryk nie trafił odpowiedzi Samuela"
      }
    ]
  };
}

export function createBetterHalfTimeline(history: BetterHalfRoundReveal[]): RoundTimelineItem[] {
  return history.map((item) => {
    const hits = Number(item.hits.Sami) + Number(item.hits.Patryk);
    return {
      round: item.round,
      label: hits === 2 ? "2/2 trafień" : hits === 1 ? "1/2 trafień" : "0/2 trafień",
      tone: hits === 2 ? "success" : hits === 1 ? "warning" : "danger"
    };
  });
}

export function createBetterHalfResultHero(state: BetterHalfGameState): ResultHeroModel {
  return {
    title: state.winnerRole ? `Wygrywa ${displayRoleName(state.winnerRole)}` : "Remis",
    subtitle: "Kto lepiej przewidywał odpowiedzi partnera",
    tone: state.winnerRole ? "info" : "neutral",
    icon: state.winnerRole ? "🏆" : "≈",
    stats: [
      { label: "Samuel", value: String(state.scores.Sami) },
      { label: "Patryk", value: String(state.scores.Patryk) },
      { label: "Rundy", value: `${state.history.length}/${state.totalRounds}` }
    ]
  };
}
