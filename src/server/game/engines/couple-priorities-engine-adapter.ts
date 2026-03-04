import {
  advanceCouplePrioritiesState,
  createCouplePrioritiesState,
  submitCouplePriorities,
  toPublicCouplePrioritiesState,
  type CouplePrioritiesInternalState
} from "../couple-priorities-engine";
import { pickPriorityPrompts } from "../question-pool";
import type { GameEngine } from "./types";

export const couplePrioritiesEngineAdapter: GameEngine = {
  id: "couple-priorities",
  isState: (state) => state.gameId === "couple-priorities",
  start: ({ db }) => {
    const prompts = pickPriorityPrompts(db, 8);
    if (prompts.length === 0) {
      return { ok: false, errorMessage: "Brak promptów dla tej gry." };
    }

    const sessionId = db.createGameSession("couple-priorities", "in_round", "{}");
    return {
      ok: true,
      state: createCouplePrioritiesState(sessionId, prompts)
    };
  },
  handleAction: ({ state, role, payload }) => {
    if (!isCouplePrioritiesState(state)) {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "couple-priorities") {
      const outcome = submitCouplePriorities(state, role, payload.ranking, payload.guessPartnerTop);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać rankingu." };
      }

      return {
        ok: true,
        eventKind: outcome.roundReveal ? "round_revealed" : "ready_changed",
        eventMessage: outcome.roundReveal
          ? `Runda ${outcome.roundReveal.round} odsłonięta.`
          : `${role} wysłał ranking.`,
        roundRecord: outcome.roundReveal
          ? {
              roundNo: outcome.roundReveal.round,
              payload: outcome.roundReveal
            }
          : undefined,
        scoreSnapshot: outcome.roundReveal?.scores,
        questionOutcome: outcome.roundReveal
          ? {
              gameId: "couple-priorities",
              questionId: outcome.roundReveal.prompt.id,
              category: null,
              roundNo: outcome.roundReveal.round,
              successByRole: {
                Sami: outcome.roundReveal.roundPoints.Sami >= 3,
                Patryk: outcome.roundReveal.roundPoints.Patryk >= 3
              },
              bothSuccess:
                outcome.roundReveal.roundPoints.Sami >= 3 &&
                outcome.roundReveal.roundPoints.Patryk >= 3,
              payload: outcome.roundReveal
            }
          : undefined
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceCouplePrioritiesState(state);
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

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Priorytetów." };
  },
  toPublicState: (state) => {
    if (!isCouplePrioritiesState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Priorytetów.");
    }
    return toPublicCouplePrioritiesState(state);
  },
  deriveFinish: (state) => {
    if (!isCouplePrioritiesState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Priorytetów.");
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

function isCouplePrioritiesState(state: { gameId: string }): state is CouplePrioritiesInternalState {
  return state.gameId === "couple-priorities";
}
