import {
  advanceBetterHalfState,
  createBetterHalfState,
  submitBetterHalfAnswer,
  toPublicBetterHalfState,
  type BetterHalfInternalState
} from "./better-half-engine";
import {
  createBattleshipState,
  fireShot,
  placeShips,
  toPublicBattleshipState,
  type BattleshipInternalState
} from "./battleship-engine";
import {
  advanceCouplePrioritiesState,
  createCouplePrioritiesState,
  submitCouplePriorities,
  toPublicCouplePrioritiesState,
  type CouplePrioritiesInternalState
} from "./couple-priorities-engine";
import {
  createFireWaterState,
  moveFireWater,
  toPublicFireWaterState,
  type FireWaterInternalState
} from "./fire-water-coop-engine";
import {
  pickPriorityPrompts,
  pickQuestions,
  pickScienceQuestions,
  seedBuiltinQuestions
} from "./question-pool";
import {
  advanceQaState,
  createQaState,
  submitQaAnswer,
  toPublicQaState,
  type QaInternalState
} from "./qa-engine";
import {
  advanceScienceQuizState,
  createScienceQuizState,
  submitScienceAnswer,
  toPublicScienceQuizState,
  type ScienceQuizInternalState
} from "./science-quiz-engine";

import type {
  ActiveGameState,
  EndRequest,
  GameActionPayload,
  GameConfigByGame,
  GameConfigPayload,
  GameEventPayload,
  GameId,
  GameResultPayload,
  GameStartPayload,
  GameStatusPayload,
  PresenceState,
  QuestionAddPayload,
  QuestionCard,
  Role
} from "../../lib/types";
import { AppDatabase } from "../db";

type AnyInternalGame =
  | QaInternalState
  | BetterHalfInternalState
  | BattleshipInternalState
  | ScienceQuizInternalState
  | CouplePrioritiesInternalState
  | FireWaterInternalState;

type EndRequestInternal = {
  requestedBy: Role;
  approvals: Set<Role>;
  expiresAtMs: number;
};

const END_REQUEST_TTL_MS = 30_000;

export type GameActionResult = {
  ok: boolean;
  errorMessage?: string;
  event?: GameEventPayload;
  result?: GameResultPayload;
  questionAdded?: QuestionCard;
};

export class GameManager {
  private activeGame: AnyInternalGame | null = null;
  private activeEndRequest: EndRequestInternal | null = null;
  private latestResult: GameResultPayload | null = null;
  private readyByGame: Record<GameId, Record<Role, boolean>> = {
    "qa-lightning": { Sami: false, Patryk: false },
    "better-half": { Sami: false, Patryk: false },
    "mini-battleship": { Sami: false, Patryk: false },
    "science-quiz": { Sami: false, Patryk: false },
    "couple-priorities": { Sami: false, Patryk: false },
    "fire-water-coop": { Sami: false, Patryk: false }
  };

  private configByGame: Partial<GameConfigByGame> = {};

  constructor(private readonly db: AppDatabase) {
    seedBuiltinQuestions(this.db);
  }

  setReady(role: Role, gameId: GameId, ready: boolean): GameActionResult {
    if (this.activeGame && this.activeGame.gameId !== gameId && this.activeGame.phase !== "finished") {
      return {
        ok: false,
        errorMessage: "Inna gra jest już aktywna."
      };
    }

    this.readyByGame[gameId][role] = ready;
    return {
      ok: true,
      event: {
        kind: "ready_changed",
        gameId,
        message: `${role} ${ready ? "jest gotowy" : "cofnął gotowość"}.`
      }
    };
  }

  setConfig(role: Role, payload: GameConfigPayload): GameActionResult {
    if (payload.gameId === "science-quiz") {
      this.configByGame["science-quiz"] = {
        category: payload.category
      };

      return {
        ok: true,
        event: {
          kind: "config_changed",
          gameId: payload.gameId,
          message: `${role} ustawił kategorię quizu: ${payload.category}.`
        }
      };
    }

    return {
      ok: false,
      errorMessage: "Nieobsługiwana konfiguracja gry."
    };
  }

  startGame(role: Role, payload: GameStartPayload, presence: PresenceState): GameActionResult {
    const gameId = payload.gameId;

    if (this.activeGame && this.activeGame.phase !== "finished") {
      return {
        ok: false,
        errorMessage: "Najpierw zakończ aktualną grę."
      };
    }

    if (!presence.online.Sami || !presence.online.Patryk) {
      return {
        ok: false,
        errorMessage: "Obie osoby muszą być online, aby rozpocząć grę."
      };
    }

    const readyState = this.readyByGame[gameId];
    if (!readyState.Sami || !readyState.Patryk) {
      return {
        ok: false,
        errorMessage: "Obie osoby muszą kliknąć Gotowy."
      };
    }

    if (gameId === "qa-lightning") {
      const questions = pickQuestions(this.db, "qa-lightning", 10);
      if (questions.length === 0) {
        return { ok: false, errorMessage: "Brak pytań dla tej gry." };
      }

      const sessionId = this.db.createGameSession(gameId, "in_round", "{}");
      this.activeGame = createQaState(sessionId, questions);
    } else if (gameId === "better-half") {
      const questions = pickQuestions(this.db, "better-half", 10);
      if (questions.length === 0) {
        return { ok: false, errorMessage: "Brak pytań dla tej gry." };
      }

      const sessionId = this.db.createGameSession(gameId, "in_round", "{}");
      this.activeGame = createBetterHalfState(sessionId, questions);
    } else if (gameId === "mini-battleship") {
      const sessionId = this.db.createGameSession(gameId, "setup", "{}");
      this.activeGame = createBattleshipState(sessionId);
    } else if (gameId === "science-quiz") {
      const category = payload.config?.category ?? this.configByGame["science-quiz"]?.category;
      if (!category) {
        return {
          ok: false,
          errorMessage: "Wybierz kategorię quizu przed startem."
        };
      }

      const questions = pickScienceQuestions(this.db, category, 10);
      if (questions.length === 0) {
        return { ok: false, errorMessage: "Brak pytań dla wybranej kategorii." };
      }

      this.configByGame["science-quiz"] = { category };
      const sessionId = this.db.createGameSession(gameId, "in_round", "{}");
      this.activeGame = createScienceQuizState(sessionId, category, questions);
    } else if (gameId === "couple-priorities") {
      const prompts = pickPriorityPrompts(this.db, 8);
      if (prompts.length === 0) {
        return { ok: false, errorMessage: "Brak promptów dla tej gry." };
      }

      const sessionId = this.db.createGameSession(gameId, "in_round", "{}");
      this.activeGame = createCouplePrioritiesState(sessionId, prompts);
    } else {
      const sessionId = this.db.createGameSession(gameId, "in_round", "{}");
      this.activeGame = createFireWaterState(sessionId);
    }

    this.activeEndRequest = null;
    this.persistActiveGame();

    return {
      ok: true,
      event: {
        kind: "game_started",
        gameId,
        message: `Rozpoczęto grę: ${gameId}.`
      }
    };
  }

  addQuestion(role: Role, payload: QuestionAddPayload): GameActionResult {
    const added = this.db.addQuestion(payload.gameId, payload.text, payload.options, "custom", role);

    return {
      ok: true,
      questionAdded: added,
      event: {
        kind: "ready_changed",
        gameId: payload.gameId,
        message: `${role} dodał nowe pytanie.`
      }
    };
  }

  handleAction(role: Role, payload: GameActionPayload): GameActionResult {
    this.cleanupExpiredEndRequests();

    if (!this.activeGame) {
      return {
        ok: false,
        errorMessage: "Brak aktywnej gry."
      };
    }

    if (payload.gameId !== this.activeGame.gameId) {
      return {
        ok: false,
        errorMessage: "Aktywna jest inna gra."
      };
    }

    if (
      payload.type === "request_end" ||
      payload.type === "approve_end" ||
      payload.type === "reject_end"
    ) {
      return this.handleEndRequestAction(role, payload.type);
    }

    if (payload.type === "return_lobby") {
      if (this.activeGame.phase !== "finished") {
        return {
          ok: false,
          errorMessage: "Do lobby można wrócić po zakończeniu gry."
        };
      }

      const endedGameId = this.activeGame.gameId;
      this.activeGame = null;
      this.activeEndRequest = null;
      this.readyByGame[endedGameId] = { Sami: false, Patryk: false };
      return {
        ok: true,
        event: {
          kind: "returned_to_lobby",
          gameId: endedGameId,
          message: "Powrót do lobby."
        }
      };
    }

    if (payload.type === "rematch") {
      if (this.activeGame.phase !== "finished") {
        return {
          ok: false,
          errorMessage: "Rewanż jest dostępny po zakończeniu gry."
        };
      }

      this.activeGame.rematchVotes.add(role);
      if (this.activeGame.rematchVotes.size === 2) {
        const gameId = this.activeGame.gameId;
        this.readyByGame[gameId] = { Sami: true, Patryk: true };
        this.activeGame = null;
        this.activeEndRequest = null;
        return this.startGame(
          role,
          { gameId } as GameStartPayload,
          {
            online: { Sami: true, Patryk: true },
            occupiedRoles: ["Sami", "Patryk"]
          }
        );
      }

      this.persistActiveGame();
      return {
        ok: true,
        event: {
          kind: "rematch_vote",
          gameId: payload.gameId,
          message: `${role} zagłosował za rewanżem.`
        }
      };
    }

    if (this.activeGame.gameId === "qa-lightning") {
      return this.handleQaAction(role, payload);
    }

    if (this.activeGame.gameId === "better-half") {
      return this.handleBetterHalfAction(role, payload);
    }

    if (this.activeGame.gameId === "mini-battleship") {
      return this.handleBattleshipAction(role, payload);
    }

    if (this.activeGame.gameId === "science-quiz") {
      return this.handleScienceQuizAction(role, payload);
    }

    if (this.activeGame.gameId === "couple-priorities") {
      return this.handleCouplePrioritiesAction(role, payload);
    }

    return this.handleFireWaterAction(role, payload);
  }

  getStateFor(role: Role): GameStatusPayload {
    this.cleanupExpiredEndRequests();

    return {
      activeGameId: this.activeGame?.gameId ?? null,
      readyByGame: this.readyByGame,
      activeGame: this.activeGame ? this.toPublicState(this.activeGame, role) : null,
      latestResult: this.latestResult,
      history: this.db.listGameHistory(100),
      configByGame: this.configByGame
    };
  }

  private handleQaAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "qa-lightning") {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "qa-lightning") {
      const outcome = submitQaAnswer(state, role, payload.answerIndex);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać odpowiedzi." };
      }

      if (outcome.roundReveal) {
        this.db.insertGameRound(state.sessionId, outcome.roundReveal.round, outcome.roundReveal);
        this.persistScores(state.sessionId, outcome.roundReveal.scores);
      }

      this.persistActiveGame();

      return {
        ok: true,
        event: {
          kind: outcome.roundReveal ? "round_revealed" : "ready_changed",
          gameId: state.gameId,
          message: outcome.roundReveal
            ? `Runda ${outcome.roundReveal.round} odsłonięta.`
            : `${role} udzielił odpowiedzi.`
        }
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceQaState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      const result = outcome.finished ? this.finishGame(state) : undefined;
      this.persistActiveGame();
      return {
        ok: true,
        result,
        event: {
          kind: outcome.finished ? "game_finished" : "round_advanced",
          gameId: state.gameId,
          message: outcome.finished ? "Gra zakończona." : "Przejście do kolejnej rundy."
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Q&A." };
  }

  private handleBetterHalfAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "better-half") {
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

      if (outcome.roundReveal) {
        this.db.insertGameRound(state.sessionId, outcome.roundReveal.round, outcome.roundReveal);
        this.persistScores(state.sessionId, outcome.roundReveal.scores);
      }

      this.persistActiveGame();
      return {
        ok: true,
        event: {
          kind: outcome.roundReveal ? "round_revealed" : "ready_changed",
          gameId: state.gameId,
          message: outcome.roundReveal
            ? `Runda ${outcome.roundReveal.round} odsłonięta.`
            : `${role} odpowiedział.`
        }
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceBetterHalfState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      const result = outcome.finished ? this.finishGame(state) : undefined;
      this.persistActiveGame();
      return {
        ok: true,
        result,
        event: {
          kind: outcome.finished ? "game_finished" : "round_advanced",
          gameId: state.gameId,
          message: outcome.finished ? "Gra zakończona." : "Przejście do kolejnej rundy."
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla tej gry." };
  }

  private handleBattleshipAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "mini-battleship") {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "place_ships") {
      const outcome = placeShips(state, role, payload.placements);
      if (!outcome.changed) {
        return { ok: false, errorMessage: outcome.message };
      }

      this.persistActiveGame();
      return {
        ok: true,
        event: {
          kind: "ships_placed",
          gameId: state.gameId,
          message: `${role} ustawił statki.`
        }
      };
    }

    if (payload.type === "fire") {
      const outcome = fireShot(state, role, payload.x, payload.y);
      if (!outcome.changed) {
        return { ok: false, errorMessage: outcome.message };
      }

      const turnNo = state.history.length;
      this.db.insertBattleshipShot(state.sessionId, turnNo, role, payload.x, payload.y, outcome.result ?? "miss");

      const result = state.phase === "finished" ? this.finishGame(state) : undefined;
      this.persistActiveGame();
      return {
        ok: true,
        result,
        event: {
          kind: state.phase === "finished" ? "game_finished" : "shot",
          gameId: state.gameId,
          message: `${role} oddał strzał (${payload.x + 1}, ${payload.y + 1}).`
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Statków." };
  }

  private handleScienceQuizAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "science-quiz") {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "science-quiz") {
      const outcome = submitScienceAnswer(state, role, payload.answerIndex);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać odpowiedzi." };
      }

      if (outcome.roundReveal) {
        this.db.insertGameRound(state.sessionId, outcome.roundReveal.round, outcome.roundReveal);
        this.persistScores(state.sessionId, outcome.roundReveal.scores);
      }

      this.persistActiveGame();

      return {
        ok: true,
        event: {
          kind: outcome.roundReveal ? "round_revealed" : "ready_changed",
          gameId: state.gameId,
          message: outcome.roundReveal
            ? `Runda ${outcome.roundReveal.round} odsłonięta.`
            : `${role} udzielił odpowiedzi.`
        }
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceScienceQuizState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      const result = outcome.finished ? this.finishGame(state) : undefined;
      this.persistActiveGame();
      return {
        ok: true,
        result,
        event: {
          kind: outcome.finished ? "game_finished" : "round_advanced",
          gameId: state.gameId,
          message: outcome.finished ? "Quiz zakończony." : "Przejście do kolejnej rundy."
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla quizu." };
  }

  private handleCouplePrioritiesAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "couple-priorities") {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type === "submit" && payload.gameId === "couple-priorities") {
      const outcome = submitCouplePriorities(state, role, payload.ranking, payload.guessPartnerTop);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie udało się zapisać rankingu." };
      }

      if (outcome.roundReveal) {
        this.db.insertGameRound(state.sessionId, outcome.roundReveal.round, outcome.roundReveal);
        this.persistScores(state.sessionId, outcome.roundReveal.scores);
      }

      this.persistActiveGame();

      return {
        ok: true,
        event: {
          kind: outcome.roundReveal ? "round_revealed" : "ready_changed",
          gameId: state.gameId,
          message: outcome.roundReveal
            ? `Runda ${outcome.roundReveal.round} odsłonięta.`
            : `${role} wysłał ranking.`
        }
      };
    }

    if (payload.type === "advance") {
      const outcome = advanceCouplePrioritiesState(state);
      if (!outcome.changed) {
        return { ok: false, errorMessage: "Nie można przejść dalej." };
      }

      const result = outcome.finished ? this.finishGame(state) : undefined;
      this.persistActiveGame();
      return {
        ok: true,
        result,
        event: {
          kind: outcome.finished ? "game_finished" : "round_advanced",
          gameId: state.gameId,
          message: outcome.finished ? "Gra zakończona." : "Przejście do kolejnej rundy."
        }
      };
    }

    return { ok: false, errorMessage: "Nieobsługiwana akcja dla Priorytetów." };
  }

  private handleFireWaterAction(role: Role, payload: GameActionPayload): GameActionResult {
    const state = this.activeGame;
    if (!state || state.gameId !== "fire-water-coop") {
      return { ok: false, errorMessage: "Ta akcja nie pasuje do aktywnej gry." };
    }

    if (payload.type !== "move") {
      return { ok: false, errorMessage: "Nieobsługiwana akcja dla Ogień i Woda." };
    }

    const outcome = moveFireWater(state, role, payload.direction);
    if (!outcome.changed) {
      return { ok: false, errorMessage: outcome.message };
    }

    const turnNo = state.history.length;
    this.db.insertGameRound(state.sessionId, turnNo, state.history[state.history.length - 1]);
    this.persistScores(state.sessionId, state.scores);

    const finished = state.phase === "finished";
    const result = finished ? this.finishGame(state) : undefined;
    this.persistActiveGame();

    return {
      ok: true,
      result,
      event: {
        kind: finished ? "level_finished" : "level_progress",
        gameId: state.gameId,
        message: finished
          ? state.outcome === "win"
            ? "Poziom ukończony!"
            : "Limit ruchów wykorzystany."
          : `${role} wykonał ruch (${payload.direction}).`
      }
    };
  }

  private finishGame(state: AnyInternalGame): GameResultPayload {
    this.activeEndRequest = null;

    const scores = {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    };

    let status = "finished";
    let winnerRole = state.winnerRole;
    let summary = winnerRole
      ? `Wygrał ${winnerRole}. Wynik ${scores.Sami}:${scores.Patryk}`
      : `Remis. Wynik ${scores.Sami}:${scores.Patryk}`;

    if (state.gameId === "fire-water-coop") {
      winnerRole = undefined;
      if (state.outcome === "win") {
        status = "coop_won";
        summary = `Ukończona współpraca. Wynik ${scores.Sami}:${scores.Patryk}`;
      } else {
        status = "coop_failed";
        summary = `Nieudana współpraca. Wynik ${scores.Sami}:${scores.Patryk}`;
      }
    }

    this.db.updateGameSessionState(
      state.sessionId,
      status,
      JSON.stringify(this.toPublicState(state, "Sami")),
      winnerRole,
      true
    );

    this.persistScores(state.sessionId, scores);

    const result: GameResultPayload = {
      gameId: state.gameId,
      sessionId: state.sessionId,
      winnerRole,
      scores,
      summary,
      endReason: "normal"
    };

    this.latestResult = result;
    return result;
  }

  private persistScores(sessionId: number, scores: { Sami: number; Patryk: number }): void {
    this.db.upsertGameScore(sessionId, "Sami", scores.Sami);
    this.db.upsertGameScore(sessionId, "Patryk", scores.Patryk);
  }

  private persistActiveGame(): void {
    if (!this.activeGame) {
      return;
    }

    let status: string = this.activeGame.phase;
    if (this.activeGame.phase === "finished") {
      const aborted =
        this.latestResult?.sessionId === this.activeGame.sessionId &&
        this.latestResult.endReason === "aborted";

      if (aborted) {
        status = "aborted";
      } else if (this.activeGame.gameId === "fire-water-coop") {
        status = this.activeGame.outcome === "win" ? "coop_won" : "coop_failed";
      } else {
        status = "finished";
      }
    }

    this.db.updateGameSessionState(
      this.activeGame.sessionId,
      status,
      JSON.stringify(this.toPublicState(this.activeGame, "Sami")),
      this.activeGame.winnerRole,
      this.activeGame.phase === "finished"
    );
  }

  private toPublicState(state: AnyInternalGame, role: Role): ActiveGameState {
    const endRequest = this.toPublicEndRequest();

    if (state.gameId === "qa-lightning") {
      return {
        ...toPublicQaState(state),
        endRequest
      };
    }

    if (state.gameId === "better-half") {
      return {
        ...toPublicBetterHalfState(state),
        endRequest
      };
    }

    if (state.gameId === "mini-battleship") {
      return {
        ...toPublicBattleshipState(state, role),
        endRequest
      };
    }

    if (state.gameId === "science-quiz") {
      return {
        ...toPublicScienceQuizState(state),
        endRequest
      };
    }

    if (state.gameId === "couple-priorities") {
      return {
        ...toPublicCouplePrioritiesState(state),
        endRequest
      };
    }

    return {
      ...toPublicFireWaterState(state),
      endRequest
    };
  }

  cleanupExpiredEndRequests(now = Date.now()): GameEventPayload | undefined {
    if (!this.activeGame || this.activeGame.phase === "finished") {
      this.activeEndRequest = null;
      return undefined;
    }

    if (!this.activeEndRequest) {
      return undefined;
    }

    if (now <= this.activeEndRequest.expiresAtMs) {
      return undefined;
    }

    const gameId = this.activeGame.gameId;
    this.activeEndRequest = null;
    this.persistActiveGame();

    return {
      kind: "end_request_cancelled",
      gameId,
      message: "Prośba o zakończenie gry wygasła."
    };
  }

  private handleEndRequestAction(
    role: Role,
    actionType: "request_end" | "approve_end" | "reject_end"
  ): GameActionResult {
    if (!this.activeGame || this.activeGame.phase === "finished") {
      return {
        ok: false,
        errorMessage: "Nie można zakończyć gry, gdy jest już zakończona."
      };
    }

    const gameId = this.activeGame.gameId;
    const now = Date.now();
    this.cleanupExpiredEndRequests(now);

    if (actionType === "request_end") {
      if (this.activeEndRequest) {
        return {
          ok: false,
          errorMessage: "Prośba o zakończenie jest już aktywna."
        };
      }

      this.activeEndRequest = {
        requestedBy: role,
        approvals: new Set([role]),
        expiresAtMs: now + END_REQUEST_TTL_MS
      };
      this.persistActiveGame();

      return {
        ok: true,
        event: {
          kind: "end_requested",
          gameId,
          message: `${role} poprosił o zakończenie gry.`
        }
      };
    }

    if (!this.activeEndRequest) {
      return {
        ok: false,
        errorMessage: "Brak aktywnej prośby o zakończenie."
      };
    }

    if (actionType === "reject_end") {
      this.activeEndRequest = null;
      this.persistActiveGame();
      return {
        ok: true,
        event: {
          kind: "end_request_cancelled",
          gameId,
          message: `${role} odrzucił zakończenie gry.`
        }
      };
    }

    if (this.activeEndRequest.approvals.has(role)) {
      return {
        ok: false,
        errorMessage: "Ta rola już potwierdziła zakończenie."
      };
    }

    this.activeEndRequest.approvals.add(role);
    if (this.activeEndRequest.approvals.size < 2) {
      this.persistActiveGame();
      return {
        ok: true,
        event: {
          kind: "end_requested",
          gameId,
          message: `${role} potwierdził zakończenie gry.`
        }
      };
    }

    const result = this.abortGame(this.activeGame);
    this.persistActiveGame();

    return {
      ok: true,
      result,
      event: {
        kind: "game_aborted",
        gameId,
        message: "Gra przerwana za zgodą obu osób."
      }
    };
  }

  private abortGame(state: AnyInternalGame): GameResultPayload {
    state.phase = "finished";
    state.winnerRole = undefined;
    this.activeEndRequest = null;

    const scores = {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    };

    this.db.updateGameSessionState(
      state.sessionId,
      "aborted",
      JSON.stringify(this.toPublicState(state, "Sami")),
      undefined,
      true
    );
    this.persistScores(state.sessionId, scores);

    const result: GameResultPayload = {
      gameId: state.gameId,
      sessionId: state.sessionId,
      winnerRole: undefined,
      scores,
      summary: `Gra przerwana za zgodą obu osób. Wynik ${scores.Sami}:${scores.Patryk}`,
      endReason: "aborted"
    };

    this.latestResult = result;
    return result;
  }

  private toPublicEndRequest(): EndRequest | undefined {
    if (!this.activeEndRequest) {
      return undefined;
    }

    return {
      requestedBy: this.activeEndRequest.requestedBy,
      approvals: Array.from(this.activeEndRequest.approvals),
      expiresAt: new Date(this.activeEndRequest.expiresAtMs).toISOString()
    };
  }
}
