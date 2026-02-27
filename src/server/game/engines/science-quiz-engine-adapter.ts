import {
  advanceScienceQuizState,
  createScienceQuizState,
  submitScienceAnswer,
  toPublicScienceQuizState,
  type ScienceQuizInternalState
} from "../science-quiz-engine";
import { pickScienceQuestions } from "../question-pool";
import type { GameEngine } from "./types";

export const scienceQuizEngineAdapter: GameEngine = {
  id: "science-quiz",
  isState: (state) => state.gameId === "science-quiz",
  start: ({ db, payload, configByGame }) => {
    const category =
      payload.gameId === "science-quiz"
        ? payload.config?.category ?? configByGame["science-quiz"]?.category
        : configByGame["science-quiz"]?.category;

    if (!category) {
      return {
        ok: false,
        errorMessage: "Wybierz kategorię quizu przed startem."
      };
    }

    const questions = pickScienceQuestions(db, category, 10);
    if (questions.length === 0) {
      return { ok: false, errorMessage: "Brak pytań dla wybranej kategorii." };
    }

    const sessionId = db.createGameSession("science-quiz", "in_round", "{}");
    return {
      ok: true,
      state: createScienceQuizState(sessionId, category, questions)
    };
  },
  handleAction: ({ state, role, payload }) => {
    if (!isScienceQuizState(state)) {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "science-quiz") {
      const outcome = submitScienceAnswer(state, role, payload.answerIndex);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać odpowiedzi." };
      }

      return {
        ok: true,
        eventKind: outcome.roundReveal ? "round_revealed" : "ready_changed",
        eventMessage: outcome.roundReveal
          ? `Runda ${outcome.roundReveal.round} odsłonięta.`
          : `${role} udzielił odpowiedzi.`,
        roundRecord: outcome.roundReveal
          ? {
              roundNo: outcome.roundReveal.round,
              payload: outcome.roundReveal
            }
          : undefined,
        scoreSnapshot: outcome.roundReveal?.scores
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceScienceQuizState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      return {
        ok: true,
        eventKind: outcome.finished ? "game_finished" : "round_advanced",
        eventMessage: outcome.finished ? "Quiz zakończony." : "Przejście do kolejnej rundy.",
        finished: outcome.finished
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla quizu." };
  },
  toPublicState: (state) => {
    if (!isScienceQuizState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Quizu.");
    }
    return toPublicScienceQuizState(state);
  },
  deriveFinish: (state) => {
    if (!isScienceQuizState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Quizu.");
    }
    const scores = state.scores;
    return {
      status: "finished",
      winnerRole: state.winnerRole,
      summary: state.winnerRole
        ? `Wygrał ${state.winnerRole}. Wynik ${scores.Sami}:${scores.Patryk}`
        : `Remis. Wynik ${scores.Sami}:${scores.Patryk}`
    };
  }
};

function isScienceQuizState(state: { gameId: string }): state is ScienceQuizInternalState {
  return state.gameId === "science-quiz";
}
