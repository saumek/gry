import type { GameDefinition, GameId } from "./types";

export type GameCatalogItem = GameDefinition & {
  shortTitle: string;
  iconPath: string;
  revealIllustration?: string;
};

const gameCatalog: Record<GameId, GameCatalogItem> = {
  "qa-lightning": {
    id: "qa-lightning",
    title: "Pytania i odpowiedzi",
    shortTitle: "Q&A",
    description: "10 wspólnych pytań 4-opcje. Punkt za zgodność odpowiedzi.",
    status: "aktywna",
    iconPath: "/assets/icons/game-qa.svg",
    revealIllustration: "/assets/illustrations/qa-editorial.svg"
  },
  "better-half": {
    id: "better-half",
    title: "Jak odpowie druga połówka",
    shortTitle: "Druga połówka",
    description: "Odpowiadasz i zgadujesz odpowiedź partnera. Punkt za trafny typ.",
    status: "aktywna",
    iconPath: "/assets/icons/game-better-half.svg",
    revealIllustration: "/assets/illustrations/better-half-editorial.svg"
  },
  "mini-battleship": {
    id: "mini-battleship",
    title: "Mini Statki 5x5",
    shortTitle: "Statki",
    description: "Statki 3,2,2. Manualne lub losowe ustawienie, potem naprzemienne strzały.",
    status: "beta",
    iconPath: "/assets/icons/game-battleship.svg"
  },
  "science-quiz": {
    id: "science-quiz",
    title: "Quiz naukowy",
    shortTitle: "Quiz",
    description: "10 pytań wiedzy z kategorii: matma, geo, nauka, ogólna.",
    status: "aktywna",
    iconPath: "/assets/icons/game-science.svg",
    revealIllustration: "/assets/illustrations/science-editorial.svg"
  },
  "couple-priorities": {
    id: "couple-priorities",
    title: "Priorytety pary",
    shortTitle: "Priorytety",
    description: "Ułóż ranking i zgadnij top-1 partnera. Punkty za zgodność i trafienie.",
    status: "aktywna",
    iconPath: "/assets/icons/game-priorities.svg",
    revealIllustration: "/assets/illustrations/priorities-editorial.svg"
  }
};

export const gameCatalogList: GameCatalogItem[] = Object.values(gameCatalog);

export function getGameCatalogItem(gameId: GameId): GameCatalogItem {
  return gameCatalog[gameId];
}
