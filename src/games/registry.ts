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
  }
];
