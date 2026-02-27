import type {
  ActiveGameState,
  GameActionPayload,
  GameConfigByGame,
  GameEventPayload,
  GameId,
  GameScore,
  GameStartPayload,
  Role
} from "../../../lib/types";
import type { AppDatabase } from "../../db";
import type { BattleshipInternalState } from "../battleship-engine";
import type { BetterHalfInternalState } from "../better-half-engine";
import type { CouplePrioritiesInternalState } from "../couple-priorities-engine";
import type { QaInternalState } from "../qa-engine";
import type { ScienceQuizInternalState } from "../science-quiz-engine";

export type AnyInternalGame =
  | QaInternalState
  | BetterHalfInternalState
  | BattleshipInternalState
  | ScienceQuizInternalState
  | CouplePrioritiesInternalState;

export type EngineStartArgs = {
  db: AppDatabase;
  payload: GameStartPayload;
  configByGame: Partial<GameConfigByGame>;
};

export type EngineStartResult =
  | {
      ok: true;
      state: AnyInternalGame;
    }
  | {
      ok: false;
      errorMessage: string;
    };

export type EngineActionArgs = {
  db: AppDatabase;
  state: AnyInternalGame;
  role: Role;
  payload: GameActionPayload;
};

export type EngineActionResult =
  | {
      ok: true;
      eventKind: GameEventPayload["kind"];
      eventMessage: string;
      roundRecord?: {
        roundNo: number;
        payload: unknown;
      };
      scoreSnapshot?: GameScore;
      battleshipShot?: {
        turnNo: number;
        shooterRole: Role;
        x: number;
        y: number;
        result: "hit" | "miss" | "sunk";
      };
      finished?: boolean;
    }
  | {
      ok: false;
      errorMessage: string;
    };

export type EngineFinishResult = {
  status: string;
  winnerRole?: Role;
  summary: string;
};

export type GameEngine = {
  id: GameId;
  isState: (state: AnyInternalGame) => boolean;
  start: (args: EngineStartArgs) => EngineStartResult;
  handleAction: (args: EngineActionArgs) => EngineActionResult;
  toPublicState: (state: AnyInternalGame, role: Role) => ActiveGameState;
  deriveFinish: (state: AnyInternalGame) => EngineFinishResult;
};
