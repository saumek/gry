import type { QuestionCard } from "../../lib/types";
import { AppDatabase } from "../db";

const qaBuiltin: Array<{ text: string; options: [string, string, string, string] }> = [
  { text: "Najlepsza pora na randkę?", options: ["Poranek", "Popołudnie", "Wieczór", "Noc"] },
  { text: "Wolny weekend: co wybierasz?", options: ["Miasto", "Góry", "Jezioro", "Dom"] },
  { text: "Ulubiony klimat filmu?", options: ["Komedia", "Thriller", "Dramat", "Sci-fi"] },
  { text: "Najlepszy plan na piątek?", options: ["Film", "Spacer", "Planszówki", "Gotowanie"] },
  { text: "Który napój częściej wybierasz?", options: ["Kawa", "Herbata", "Sok", "Woda"] },
  { text: "Idealny prezent to...", options: ["Doświadczenie", "Coś praktycznego", "Rękodzieło", "Niespodzianka"] },
  { text: "Co najbardziej relaksuje?", options: ["Muzyka", "Sen", "Ruch", "Rozmowa"] },
  { text: "Który posiłek dnia jest top?", options: ["Śniadanie", "Obiad", "Kolacja", "Przekąski"] },
  { text: "Wspólny wyjazd: preferujesz", options: ["Plan minuta po minucie", "Lekki plan", "Improwizację", "Mieszankę"] },
  { text: "Co częściej odkładasz na później?", options: ["Sprzątanie", "Zakupy", "Odpowiedzi na wiadomości", "Trening"] },
  { text: "Najlepsza pogoda to", options: ["Słońce", "Deszcz", "Śnieg", "Wiatr"] },
  { text: "Wspólna aktywność numer 1", options: ["Gotowanie", "Granie", "Spacer", "Podróż"] },
  { text: "Jaki deser częściej wygrywa?", options: ["Lody", "Ciasto", "Czekolada", "Owoce"] },
  { text: "Który dzień tygodnia lubisz najbardziej?", options: ["Piątek", "Sobota", "Niedziela", "Poniedziałek"] },
  { text: "Jak podejmujesz decyzje?", options: ["Szybko", "Po analizie", "Intuicyjnie", "Po konsultacji"] }
];

const betterHalfBuiltin: Array<{ text: string; options: [string, string, string, string] }> = [
  { text: "Gdyby partner wybierał kolację, co wskaże?", options: ["Pizza", "Makaron", "Sushi", "Burgery"] },
  { text: "Jaki prezent partner uzna za najlepszy?", options: ["Weekend", "Gadżet", "Biżuteria", "Książka"] },
  { text: "Partner bardziej ceni", options: ["Spontan", "Plan", "Komfort", "Przygody"] },
  { text: "Na deser partner wybierze", options: ["Lody", "Sernik", "Czekoladę", "Nic słodkiego"] },
  { text: "Partner najchętniej obejrzy", options: ["Komedię", "Kryminał", "Dokument", "Fantasy"] },
  { text: "Idealna randka partnera to", options: ["Kino", "Kolacja", "Spacer", "Planszówki"] },
  { text: "Partner szybciej odpowiada", options: ["SMS", "Telefon", "Wiadomość głosowa", "Wieczorem na spokojnie"] },
  { text: "Partner woli poranek czy wieczór?", options: ["Zdecydowanie poranek", "Raczej poranek", "Raczej wieczór", "Zdecydowanie wieczór"] },
  { text: "Partner wybierze urlop", options: ["Morze", "Góry", "Miasto", "Wieś"] },
  { text: "Partner bardziej oszczędza na", options: ["Jedzeniu", "Ubraniach", "Elektronice", "Wyjazdach"] },
  { text: "Partner najchętniej zagra w", options: ["Quiz", "Strategię", "Zręcznościówkę", "Co-op"] },
  { text: "Partner najbardziej docenia", options: ["Szczerość", "Humor", "Wsparcie", "Czułość"] },
  { text: "Partner częściej proponuje", options: ["Wyjście", "Domowy wieczór", "Wyjazd", "Nowe hobby"] },
  { text: "Partner przy stresie wybierze", options: ["Ruch", "Rozmowę", "Ciszę", "Sen"] },
  { text: "Partner lubi niespodzianki", options: ["Bardzo", "Raczej tak", "Raczej nie", "Wcale"] }
];

export function seedBuiltinQuestions(db: AppDatabase): void {
  db.seedBuiltinQuestions("qa-lightning", qaBuiltin);
  db.seedBuiltinQuestions("better-half", betterHalfBuiltin);
}

export function pickQuestions(
  db: AppDatabase,
  gameId: "qa-lightning" | "better-half",
  count: number
): QuestionCard[] {
  const selected = db.drawQuestions(gameId, count);
  if (selected.length >= count) {
    return selected.slice(0, count);
  }

  if (selected.length === 0) {
    return [];
  }

  const doubled = [...selected];
  while (doubled.length < count) {
    doubled.push(selected[doubled.length % selected.length]);
  }

  return doubled;
}
