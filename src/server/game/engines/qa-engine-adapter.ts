import {
  advanceQaState,
  createQaState,
  submitQaAnswer,
  toPublicQaState,
  type QaInternalState
} from "../qa-engine";
import { pickQuestions } from "../question-pool";
import type { GameEngine } from "./types";

export const qaEngineAdapter: GameEngine = {
  id: "qa-lightning",
  isState: (state) => state.gameId === "qa-lightning",
  start: ({ db }) => {
    const questions = pickQuestions(db, "qa-lightning", 10);
    if (questions.length === 0) {
      return { ok: false, errorMessage: "Brak pytań dla tej gry." };
    }

    const sessionId = db.createGameSession("qa-lightning", "in_round", "{}");
    return {
      ok: true,
      state: createQaState(sessionId, questions)
    };
  },
  handleAction: ({ state, role, payload }) => {
    if (!isQaState(state)) {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "qa-lightning") {
      const outcome = submitQaAnswer(state, role, payload.answerIndex);
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
        scoreSnapshot: outcome.roundReveal?.scores,
        questionOutcome: outcome.roundReveal
          ? {
              gameId: "qa-lightning",
              questionId: outcome.roundReveal.question.id,
              category: null,
              roundNo: outcome.roundReveal.round,
              successByRole: {
                Sami: outcome.roundReveal.matched,
                Patryk: outcome.roundReveal.matched
              },
              bothSuccess: outcome.roundReveal.matched,
              payload: outcome.roundReveal
            }
          : undefined
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceQaState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      return {
        ok: true,
        eventKind: outcome.finished ? "game_finished" : "round_advanced",
        eventMessage: outcome.finished ? "Gra zakończona." : "Przejście do kolejnej rundy.",
        finished: outcome.finished
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Q&A." };
  },
  toPublicState: (state) => {
    if (!isQaState(state)) {
      throw new Error("Niepoprawny stan dla adaptera QA.");
    }
    return toPublicQaState(state);
  },
  deriveFinish: (state) => {
    if (!isQaState(state)) {
      throw new Error("Niepoprawny stan dla adaptera QA.");
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

function isQaState(state: { gameId: string }): state is QaInternalState {
  return state.gameId === "qa-lightning";
}
