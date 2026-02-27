import {
  createBattleshipState,
  fireShot,
  placeShips,
  toPublicBattleshipState,
  type BattleshipInternalState
} from "../battleship-engine";
import type { GameEngine } from "./types";

export const battleshipEngineAdapter: GameEngine = {
  id: "mini-battleship",
  isState: (state) => state.gameId === "mini-battleship",
  start: ({ db }) => {
    const sessionId = db.createGameSession("mini-battleship", "setup", "{}");
    return {
      ok: true,
      state: createBattleshipState(sessionId)
    };
  },
  handleAction: ({ state, role, payload }) => {
    if (!isBattleshipState(state)) {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "place_ships") {
      const outcome = placeShips(state, role, payload.placements);
      if (!outcome.changed) {
        return { ok: false, errorMessage: outcome.message ?? "Nie udało się ustawić statków." };
      }

      return {
        ok: true,
        eventKind: "ships_placed",
        eventMessage: `${role} ustawił statki.`
      };
    }

    if (payload.type === "fire") {
      const outcome = fireShot(state, role, payload.x, payload.y);
      if (!outcome.changed) {
        return { ok: false, errorMessage: outcome.message ?? "Nie udało się oddać strzału." };
      }

      return {
        ok: true,
        eventKind: state.phase === "finished" ? "game_finished" : "shot",
        eventMessage: `${role} oddał strzał (${payload.x + 1}, ${payload.y + 1}).`,
        finished: state.phase === "finished",
        scoreSnapshot: {
          Sami: state.scores.Sami,
          Patryk: state.scores.Patryk
        },
        battleshipShot: {
          turnNo: state.history.length,
          shooterRole: role,
          x: payload.x,
          y: payload.y,
          result: outcome.result ?? "miss"
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Statków." };
  },
  toPublicState: (state, role) => {
    if (!isBattleshipState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Statków.");
    }
    return toPublicBattleshipState(state, role);
  },
  deriveFinish: (state) => {
    if (!isBattleshipState(state)) {
      throw new Error("Niepoprawny stan dla adaptera Statków.");
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

function isBattleshipState(state: { gameId: string }): state is BattleshipInternalState {
  return state.gameId === "mini-battleship";
}
