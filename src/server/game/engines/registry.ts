import type { GameId } from "../../../lib/types";
import { battleshipEngineAdapter } from "./battleship-engine-adapter";
import { betterHalfEngineAdapter } from "./better-half-engine-adapter";
import { couplePrioritiesEngineAdapter } from "./couple-priorities-engine-adapter";
import { qaEngineAdapter } from "./qa-engine-adapter";
import { scienceQuizEngineAdapter } from "./science-quiz-engine-adapter";
import type { GameEngine } from "./types";

const engineList: GameEngine[] = [
  qaEngineAdapter,
  betterHalfEngineAdapter,
  battleshipEngineAdapter,
  scienceQuizEngineAdapter,
  couplePrioritiesEngineAdapter
];

export const engineRegistry: ReadonlyMap<GameId, GameEngine> = new Map(
  engineList.map((engine) => [engine.id, engine])
);

export const activeGameIds = engineList.map((engine) => engine.id);
