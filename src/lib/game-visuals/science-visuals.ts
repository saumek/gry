import type {
  ResultHeroModel,
  RoundTimelineItem,
  ScienceQuizGameState,
  ScienceQuizRoundReveal,
  GameRoundVisualState
} from "../types";

export function createScienceRoundVisual(reveal: ScienceQuizRoundReveal): GameRoundVisualState {
  const pointsSami = Number(reveal.correctByRole.Sami) + Number(reveal.bothCorrect);
  const pointsPatryk = Number(reveal.correctByRole.Patryk) + Number(reveal.bothCorrect);
  const tone = reveal.bothCorrect
    ? "success"
    : reveal.correctByRole.Sami || reveal.correctByRole.Patryk
      ? "warning"
      : "danger";

  return {
    title: "Poprawna odpowiedź",
    subtitle: reveal.question.options[reveal.correctIndex],
    tone,
    icon: reveal.bothCorrect ? "🧠" : "❓",
    decisions: [
      {
        actor: "System",
        title: "Wynik poprawny",
        choice: reveal.question.options[reveal.correctIndex],
        tone: "success",
        icon: "✓"
      },
      {
        actor: "Sami",
        title: "Wybór Sami",
        choice: reveal.question.options[reveal.answers.Sami],
        tone: reveal.correctByRole.Sami ? "success" : "danger",
        icon: reveal.correctByRole.Sami ? "✓" : "✕"
      },
      {
        actor: "Patryk",
        title: "Wybór Patryka",
        choice: reveal.question.options[reveal.answers.Patryk],
        tone: reveal.correctByRole.Patryk ? "success" : "danger",
        icon: reveal.correctByRole.Patryk ? "✓" : "✕"
      }
    ],
    points: [
      {
        label: "Sami",
        value: `+${pointsSami}`,
        tone: pointsSami > 0 ? "success" : "danger",
        icon: pointsSami > 0 ? "✓" : "✕",
        detail: reveal.correctByRole.Sami
          ? reveal.bothCorrect
            ? "+1 za poprawną odpowiedź i +1 bonus za obie poprawne"
            : "+1 za poprawną odpowiedź"
          : "+0, bo odpowiedź była niepoprawna"
      },
      {
        label: "Patryk",
        value: `+${pointsPatryk}`,
        tone: pointsPatryk > 0 ? "success" : "danger",
        icon: pointsPatryk > 0 ? "✓" : "✕",
        detail: reveal.correctByRole.Patryk
          ? reveal.bothCorrect
            ? "+1 za poprawną odpowiedź i +1 bonus za obie poprawne"
            : "+1 za poprawną odpowiedź"
          : "+0, bo odpowiedź była niepoprawna"
      },
      {
        label: "Bonus obie poprawne",
        value: reveal.bothCorrect ? "+1/+1" : "+0/+0",
        tone: reveal.bothCorrect ? "info" : "neutral",
        icon: reveal.bothCorrect ? "★" : "•",
        detail: reveal.bothCorrect
          ? "Obie osoby zaznaczyły poprawną odpowiedź"
          : "Bonus nie wszedł, bo nie było dwóch poprawnych odpowiedzi"
      }
    ]
  };
}

export function createScienceTimeline(history: ScienceQuizRoundReveal[]): RoundTimelineItem[] {
  return history.map((item) => {
    const hits = Number(item.correctByRole.Sami) + Number(item.correctByRole.Patryk);
    return {
      round: item.round,
      label: hits === 2 ? "Obie poprawne" : hits === 1 ? "1 poprawna" : "0 poprawnych",
      tone: hits === 2 ? "success" : hits === 1 ? "warning" : "danger"
    };
  });
}

export function createScienceResultHero(state: ScienceQuizGameState): ResultHeroModel {
  return {
    title: state.winnerRole ? `Wygrywa ${state.winnerRole}` : "Remis",
    subtitle: `Kategoria: ${categoryLabel(state.category)}`,
    tone: state.winnerRole ? "info" : "neutral",
    icon: state.winnerRole ? "🏆" : "≈",
    stats: [
      { label: "Sami", value: String(state.scores.Sami) },
      { label: "Patryk", value: String(state.scores.Patryk) },
      { label: "Rundy", value: `${state.history.length}/${state.totalRounds}` }
    ]
  };
}

function categoryLabel(category: ScienceQuizGameState["category"]): string {
  if (category === "matma") {
    return "Matma";
  }

  if (category === "geografia") {
    return "Geografia";
  }

  if (category === "nauka") {
    return "Nauka";
  }

  return "Wiedza ogólna";
}
