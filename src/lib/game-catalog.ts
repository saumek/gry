import type { GameDefinition, GameId } from "./types";

export type GameCatalogItem = GameDefinition & {
  shortTitle: string;
};

const gameCatalog: Record<GameId, GameCatalogItem> = {
  "qa-lightning": {
    id: "qa-lightning",
    title: "Pytania i odpowiedzi",
    shortTitle: "Q&A",
    description: "10 wspólnych pytań 4-opcje. Punkt za zgodność odpowiedzi.",
    status: "aktywna"
  },
  "better-half": {
    id: "better-half",
    title: "Jak odpowie druga połówka",
    shortTitle: "Druga połówka",
    description: "Odpowiadasz i zgadujesz odpowiedź partnera. Punkt za trafny typ.",
    status: "aktywna"
  },
  "mini-battleship": {
    id: "mini-battleship",
    title: "Mini Statki 5x5",
    shortTitle: "Statki",
    description: "Statki 3,2,2. Manualne lub losowe ustawienie, potem naprzemienne strzały.",
    status: "beta"
  },
  "science-quiz": {
    id: "science-quiz",
    title: "Quiz naukowy",
    shortTitle: "Quiz",
    description: "10 pytań wiedzy z kategorii: matma, geo, nauka, ogólna.",
    status: "aktywna"
  },
  "couple-priorities": {
    id: "couple-priorities",
    title: "Priorytety pary",
    shortTitle: "Priorytety",
    description: "Ułóż ranking i zgadnij top-1 partnera. Punkty za zgodność i trafienie.",
    status: "aktywna"
  }
};

export const gameCatalogList: GameCatalogItem[] = Object.values(gameCatalog);

export function getGameCatalogItem(gameId: GameId): GameCatalogItem {
  return gameCatalog[gameId];
}
