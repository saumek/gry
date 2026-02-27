import type { GameDefinition } from "../lib/types";
import { gameCatalogList } from "../lib/game-catalog";

export const gamesRegistry: GameDefinition[] = gameCatalogList.map((game) => ({
  id: game.id,
  title: game.title,
  description: game.description,
  status: game.status
}));
