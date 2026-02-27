import type { GameDefinition } from "../lib/types";

export const gamesRegistry: GameDefinition[] = [
  {
    id: "qa-lightning",
    title: "Pytania i odpowiedzi",
    description: "10 wspólnych pytań 4-opcje. Punkt za zgodność odpowiedzi.",
    status: "aktywna"
  },
  {
    id: "better-half",
    title: "Jak odpowie druga połówka",
    description:
      "Odpowiadasz i zgadujesz odpowiedź partnera. Punkt za trafny typ.",
    status: "aktywna"
  },
  {
    id: "mini-battleship",
    title: "Mini Statki 5x5",
    description:
      "Statki 3,2,2. Manualne lub losowe ustawienie, potem naprzemienne strzały.",
    status: "beta"
  },
  {
    id: "science-quiz",
    title: "Quiz naukowy",
    description: "10 pytań wiedzy z kategorii: matma, geo, nauka, ogólna.",
    status: "aktywna"
  },
  {
    id: "couple-priorities",
    title: "Priorytety pary",
    description: "Ułóż ranking i zgadnij top-1 partnera. Punkty za zgodność i trafienie.",
    status: "aktywna"
  },
  {
    id: "fire-water-coop",
    title: "Ogień i Woda Co-op",
    description: "Wspólna plansza 5x5, klucze i wyjście w 24 ruchach.",
    status: "beta"
  }
];
