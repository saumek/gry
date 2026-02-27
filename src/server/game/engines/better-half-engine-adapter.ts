import {
  advanceBetterHalfState,
  createBetterHalfState,
  submitBetterHalfAnswer,
  toPublicBetterHalfState,
  type BetterHalfInternalState
} from "../better-half-engine";
import { pickQuestions } from "../question-pool";
import type { GameEngine } from "./types";

export const betterHalfEngineAdapter: GameEngine = {
  id: "better-half",
  isState: (state) => state.gameId === "better-half",
  start: ({ db }) => {
    const questions = pickQuestions(db, "better-half", 10);
    if (questions.length === 0) {
      return { ok: false, errorMessage: "Brak pytań dla tej gry." };
    }

    const sessionId = db.createGameSession("better-half", "in_round", "{}");
    return {
      ok: true,
      state: createBetterHalfState(sessionId, questions)
    };
  },
  handleAction: ({ state, role, payload }) => {
    if (!isBetterHalfState(state)) {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "better-half") {
      const outcome = submitBetterHalfAnswer(
        state,
        role,
        payload.selfAnswerIndex,
        payload.guessPartnerIndex
      );
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać odpowiedzi." };
      }

      return {
        ok: true,
        eventKind: outcome.roundReveal ? "round_revealed" : "ready_changed",
        eventMessage: outcome.roundReveal
          ? `Runda ${outcome.roundReveal.round} odsłonięta.`
          : `${role} odpowiedział.`,
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
      const outcome = advanceBetterHalfState(state);
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

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla tej gry." };
  },
  toPublicState: (state) => {
    if (!isBetterHalfState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Better Half.");
    }
    return toPublicBetterHalfState(state);
  },
  deriveFinish: (state) => {
    if (!isBetterHalfState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Better Half.");
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

function isBetterHalfState(state: { gameId: string }): state is BetterHalfInternalState {
  return state.gameId === "better-half";
}
