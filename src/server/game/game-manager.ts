import type {
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
import { activeGameIds, engineRegistry } from "./engines/registry";
import type { AnyInternalGame } from "./engines/types";
import { seedBuiltinQuestions } from "./question-pool";

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
  private stateRevision = 0;
  private readyByGame = this.createInitialReadyByGame();
  private configByGame: Partial<GameConfigByGame> = {};

  constructor(private readonly db: AppDatabase) {
    seedBuiltinQuestions(this.db);
  }

  getStateRevision(): number {
    return this.stateRevision;
  }

  setReady(role: Role, gameId: GameId, ready: boolean): GameActionResult {
    if (this.activeGame && this.activeGame.gameId !== gameId && this.activeGame.phase !== "finished") {
      return {
        ok: false,
        errorMessage: "Inna gra jest już aktywna."
      };
    }

    if (this.readyByGame[gameId][role] === ready) {
      return { ok: true };
    }

    this.readyByGame[gameId][role] = ready;
    this.bumpStateRevision();

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
    if (payload.gameId !== "science-quiz") {
      return {
        ok: false,
        errorMessage: "Nieobsługiwana konfiguracja gry."
      };
    }

    if (this.activeGame && this.activeGame.phase !== "finished") {
      return {
        ok: false,
        errorMessage: "Konfigurację można zmieniać tylko w lobby."
      };
    }

    if (this.configByGame["science-quiz"]?.category === payload.category) {
      return { ok: true };
    }

    this.configByGame["science-quiz"] = {
      category: payload.category
    };
    this.bumpStateRevision();

    return {
      ok: true,
      event: {
        kind: "config_changed",
        gameId: payload.gameId,
        message: `${role} ustawił kategorię quizu: ${payload.category}.`
      }
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

    const engine = engineRegistry.get(gameId);
    if (!engine) {
      return {
        ok: false,
        errorMessage: "Nieobsługiwana gra."
      };
    }

    const startResult = engine.start({
      db: this.db,
      payload,
      configByGame: this.configByGame
    });

    if (!startResult.ok) {
      return {
        ok: false,
        errorMessage: startResult.errorMessage
      };
    }

    this.activeGame = startResult.state;
    this.activeEndRequest = null;

    if (startResult.state.gameId === "science-quiz") {
      this.configByGame["science-quiz"] = {
        category: startResult.state.category
      };
    }

    this.persistActiveGame();
    this.bumpStateRevision();

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
        kind: "question_added",
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
      this.clearAllReadyStates();
      this.bumpStateRevision();

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
        this.bumpStateRevision();
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
      this.bumpStateRevision();
      return {
        ok: true,
        event: {
          kind: "rematch_vote",
          gameId: payload.gameId,
          message: `${role} zagłosował za rewanżem.`
        }
      };
    }

    const engine = engineRegistry.get(this.activeGame.gameId);
    if (!engine || !engine.isState(this.activeGame)) {
      return {
        ok: false,
        errorMessage: "Nie udało się dopasować silnika gry."
      };
    }

    const outcome = engine.handleAction({
      db: this.db,
      state: this.activeGame,
      role,
      payload
    });

    if (!outcome.ok) {
      return {
        ok: false,
        errorMessage: outcome.errorMessage
      };
    }

    if (outcome.roundRecord) {
      this.db.insertGameRound(
        this.activeGame.sessionId,
        outcome.roundRecord.roundNo,
        outcome.roundRecord.payload
      );
    }

    if (outcome.battleshipShot) {
      this.db.insertBattleshipShot(
        this.activeGame.sessionId,
        outcome.battleshipShot.turnNo,
        outcome.battleshipShot.shooterRole,
        outcome.battleshipShot.x,
        outcome.battleshipShot.y,
        outcome.battleshipShot.result
      );
    }

    if (outcome.questionOutcome) {
      this.db.recordQuestionOutcome({
        gameId: outcome.questionOutcome.gameId,
        questionId: outcome.questionOutcome.questionId,
        category: outcome.questionOutcome.category,
        sessionId: this.activeGame.sessionId,
        roundNo: outcome.questionOutcome.roundNo,
        shownAt: new Date().toISOString(),
        successByRole: outcome.questionOutcome.successByRole,
        bothSuccess: outcome.questionOutcome.bothSuccess,
        outcome: outcome.questionOutcome.payload
      });
    }

    if (outcome.scoreSnapshot) {
      this.persistScores(this.activeGame.sessionId, outcome.scoreSnapshot);
    }

    let result: GameResultPayload | undefined;
    if (
      this.activeGame.phase === "finished" &&
      this.latestResult?.sessionId !== this.activeGame.sessionId
    ) {
      result = this.finishGame(this.activeGame);
    }

    this.persistActiveGame();
    this.bumpStateRevision();

    return {
      ok: true,
      result,
      event: {
        kind: outcome.eventKind,
        gameId: this.activeGame.gameId,
        message: outcome.eventMessage
      }
    };
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
    this.bumpStateRevision();

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
      this.bumpStateRevision();

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
      this.bumpStateRevision();
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
      this.bumpStateRevision();
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

  private finishGame(state: AnyInternalGame): GameResultPayload {
    this.activeEndRequest = null;

    const engine = engineRegistry.get(state.gameId);
    if (!engine || !engine.isState(state)) {
      throw new Error(`Brak adaptera dla gry ${state.gameId}.`);
    }

    const finish = engine.deriveFinish(state);
    const scores = {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    };

    this.db.updateGameSessionState(
      state.sessionId,
      finish.status,
      JSON.stringify(this.toPublicState(state, "Sami")),
      finish.winnerRole,
      true
    );

    this.persistScores(state.sessionId, scores);

    const result: GameResultPayload = {
      gameId: state.gameId,
      sessionId: state.sessionId,
      winnerRole: finish.winnerRole,
      scores,
      summary: finish.summary,
      endReason: "normal"
    };

    this.latestResult = result;
    this.bumpStateRevision();
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
      } else {
        const engine = engineRegistry.get(this.activeGame.gameId);
        if (engine && engine.isState(this.activeGame)) {
          status = engine.deriveFinish(this.activeGame).status;
        } else {
          status = "finished";
        }
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

  private toPublicState(state: AnyInternalGame, role: Role): ReturnType<GameManager["getStateFor"]>["activeGame"] {
    const engine = engineRegistry.get(state.gameId);
    if (!engine || !engine.isState(state)) {
      return null;
    }

    return {
      ...engine.toPublicState(state, role),
      endRequest: this.toPublicEndRequest()
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
    this.bumpStateRevision();
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

  private createInitialReadyByGame(): Record<GameId, Record<Role, boolean>> {
    const initial = {} as Record<GameId, Record<Role, boolean>>;
    for (const gameId of activeGameIds) {
      initial[gameId] = {
        Sami: false,
        Patryk: false
      };
    }

    return initial;
  }

  private clearAllReadyStates(): void {
    for (const gameId of activeGameIds) {
      this.readyByGame[gameId] = {
        Sami: false,
        Patryk: false
      };
    }
  }

  private bumpStateRevision(): void {
    this.stateRevision += 1;
  }
}
