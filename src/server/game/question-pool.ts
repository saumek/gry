import type {
  CouplePromptCard,
  QuestionCard,
  QuizCategory,
  ScienceQuestionPrompt
} from "../../lib/types";
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

const capitals: Array<{ country: string; capital: string }> = [
  { country: "Polski", capital: "Warszawa" },
  { country: "Niemiec", capital: "Berlin" },
  { country: "Francji", capital: "Paryż" },
  { country: "Włoch", capital: "Rzym" },
  { country: "Hiszpanii", capital: "Madryt" },
  { country: "Portugalii", capital: "Lizbona" },
  { country: "Czech", capital: "Praga" },
  { country: "Słowacji", capital: "Bratysława" },
  { country: "Węgier", capital: "Budapeszt" },
  { country: "Australii", capital: "Canberra" },
  { country: "Kanady", capital: "Ottawa" },
  { country: "Meksyku", capital: "Meksyk" },
  { country: "Argentyny", capital: "Buenos Aires" },
  { country: "Brazylii", capital: "Brasilia" },
  { country: "Chin", capital: "Pekin" },
  { country: "Japonii", capital: "Tokio" },
  { country: "Korei Południowej", capital: "Seul" },
  { country: "Indii", capital: "Nowe Delhi" },
  { country: "Egiptu", capital: "Kair" },
  { country: "Maroka", capital: "Rabat" },
  { country: "Norwegii", capital: "Oslo" },
  { country: "Szwecji", capital: "Sztokholm" },
  { country: "Finlandii", capital: "Helsinki" },
  { country: "Danii", capital: "Kopenhaga" },
  { country: "Grecji", capital: "Ateny" },
  { country: "Turcji", capital: "Ankara" },
  { country: "Ukrainy", capital: "Kijów" },
  { country: "Rumunii", capital: "Bukareszt" },
  { country: "Bułgarii", capital: "Sofia" },
  { country: "Irlandii", capital: "Dublin" }
];

const elements: Array<{ name: string; symbol: string }> = [
  { name: "Wodór", symbol: "H" },
  { name: "Hel", symbol: "He" },
  { name: "Lit", symbol: "Li" },
  { name: "Beryl", symbol: "Be" },
  { name: "Bor", symbol: "B" },
  { name: "Węgiel", symbol: "C" },
  { name: "Azot", symbol: "N" },
  { name: "Tlen", symbol: "O" },
  { name: "Fluor", symbol: "F" },
  { name: "Neon", symbol: "Ne" },
  { name: "Sód", symbol: "Na" },
  { name: "Magnez", symbol: "Mg" },
  { name: "Glin", symbol: "Al" },
  { name: "Krzem", symbol: "Si" },
  { name: "Fosfor", symbol: "P" },
  { name: "Siarka", symbol: "S" },
  { name: "Chlor", symbol: "Cl" },
  { name: "Argon", symbol: "Ar" },
  { name: "Potas", symbol: "K" },
  { name: "Wapń", symbol: "Ca" },
  { name: "Skand", symbol: "Sc" },
  { name: "Tytan", symbol: "Ti" },
  { name: "Wanad", symbol: "V" },
  { name: "Chrom", symbol: "Cr" },
  { name: "Mangan", symbol: "Mn" },
  { name: "Żelazo", symbol: "Fe" },
  { name: "Kobalt", symbol: "Co" },
  { name: "Nikiel", symbol: "Ni" },
  { name: "Miedź", symbol: "Cu" },
  { name: "Cynk", symbol: "Zn" }
];

const priorityAxes: Array<{ stem: string; options: [string, string, string, string] }> = [
  { stem: "Co najbardziej wzmacnia relację", options: ["Rozmowa", "Wspólny czas", "Wspólne cele", "Humor"] },
  { stem: "Najważniejsze na wspólny weekend", options: ["Spontan", "Plan", "Odpoczynek", "Nowe miejsca"] },
  { stem: "Najbardziej cenisz w codzienności", options: ["Stabilność", "Przygodę", "Wsparcie", "Niezależność"] },
  { stem: "Wybór na wieczór we dwoje", options: ["Film", "Spacer", "Gra", "Gotowanie"] },
  { stem: "Najlepszy sposób na konflikt", options: ["Szczera rozmowa", "Przerwa", "Humor", "Kompromis"] },
  { stem: "Co daje najwięcej radości", options: ["Niespodzianki", "Rytuały", "Wyjazdy", "Wspólne hobby"] },
  { stem: "Priorytet przy planowaniu miesiąca", options: ["Budżet", "Czas razem", "Rozwój", "Relaks"] },
  { stem: "Najważniejsze przy decyzjach", options: ["Sercem", "Analizą", "Intuicją", "Konsultacją"] },
  { stem: "Co daje poczucie bliskości", options: ["Czułość", "Rozmowy", "Wspólne cele", "Drobne gesty"] },
  { stem: "Najlepszy reset po trudnym dniu", options: ["Cisza", "Ruch", "Śmiech", "Przytulenie"] }
];

const priorityContexts = ["w domu", "na wyjeździe", "w tygodniu", "w stresie"];

const extraGeneralFacts: Array<{
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}> = [
  { text: "Ile dni ma tydzień?", options: ["5", "6", "7", "8"], correctIndex: 2 },
  { text: "Ile minut ma godzina?", options: ["45", "50", "60", "90"], correctIndex: 2 },
  { text: "Ile sekund ma minuta?", options: ["30", "45", "60", "90"], correctIndex: 2 },
  { text: "Ile kontynentów ma Ziemia?", options: ["5", "6", "7", "8"], correctIndex: 2 },
  { text: "Ile godzin ma doba?", options: ["12", "18", "24", "36"], correctIndex: 2 },
  { text: "Która planeta jest nazywana Czerwoną Planetą?", options: ["Wenus", "Mars", "Jowisz", "Saturn"], correctIndex: 1 },
  { text: "Najdłuższa rzeka świata to", options: ["Amazonka", "Nil", "Jangcy", "Missisipi"], correctIndex: 0 },
  { text: "Największy ocean to", options: ["Atlantycki", "Spokojny", "Indyjski", "Arktyczny"], correctIndex: 1 },
  { text: "Kto napisał \"Pana Tadeusza\"?", options: ["Sienkiewicz", "Mickiewicz", "Prus", "Reymont"], correctIndex: 1 },
  { text: "Jak nazywa się stolica Wielkiej Brytanii?", options: ["Dublin", "Manchester", "Londyn", "Glasgow"], correctIndex: 2 },
  { text: "Jak nazywa się największy kontynent?", options: ["Afryka", "Europa", "Azja", "Ameryka Płn."], correctIndex: 2 }
];

function rotateOptions(
  correct: string,
  distractors: [string, string, string],
  seed: number
): { options: [string, string, string, string]; correctIndex: number } {
  const raw = [correct, ...distractors];
  const shift = seed % 4;
  const rotated = [...raw.slice(shift), ...raw.slice(0, shift)] as [string, string, string, string];
  return {
    options: rotated,
    correctIndex: rotated.indexOf(correct)
  };
}

function buildMathCards(): Array<{ text: string; options: [string, string, string, string]; correctIndex: number }> {
  const cards: Array<{ text: string; options: [string, string, string, string]; correctIndex: number }> = [];

  for (let i = 0; i < 30; i += 1) {
    const a = 6 + i;
    const b = (i % 9) + 2;
    const correct = a + b;
    const wrongA = correct + ((i % 4) + 1);
    const wrongB = Math.max(1, correct - ((i % 5) + 1));
    const wrongC = correct + ((i % 3) + 6);
    const { options, correctIndex } = rotateOptions(
      String(correct),
      [String(wrongA), String(wrongB), String(wrongC)],
      i
    );

    cards.push({
      text: `Ile to ${a} + ${b}?`,
      options,
      correctIndex
    });
  }

  return cards;
}

function buildGeographyCards(): Array<{ text: string; options: [string, string, string, string]; correctIndex: number }> {
  return capitals.map((entry, index) => {
    const wrong = [
      capitals[(index + 1) % capitals.length].capital,
      capitals[(index + 5) % capitals.length].capital,
      capitals[(index + 9) % capitals.length].capital
    ] as [string, string, string];

    const { options, correctIndex } = rotateOptions(entry.capital, wrong, index);
    return {
      text: `Jaka jest stolica ${entry.country}?`,
      options,
      correctIndex
    };
  });
}

function buildScienceCards(): Array<{ text: string; options: [string, string, string, string]; correctIndex: number }> {
  return elements.map((entry, index) => {
    const wrong = [
      elements[(index + 1) % elements.length].symbol,
      elements[(index + 7) % elements.length].symbol,
      elements[(index + 13) % elements.length].symbol
    ] as [string, string, string];

    const { options, correctIndex } = rotateOptions(entry.symbol, wrong, index);
    return {
      text: `Jaki symbol chemiczny ma pierwiastek: ${entry.name}?`,
      options,
      correctIndex
    };
  });
}

function buildGeneralKnowledgeCards(): Array<{
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}> {
  const cards: Array<{
    text: string;
    options: [string, string, string, string];
    correctIndex: number;
  }> = [];

  const months = [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień"
  ];

  for (let i = 0; i < months.length; i += 1) {
    const correct = i + 1;
    const wrongA = ((i + 2) % 12) + 1;
    const wrongB = ((i + 5) % 12) + 1;
    const wrongC = ((i + 8) % 12) + 1;
    const { options, correctIndex } = rotateOptions(
      String(correct),
      [String(wrongA), String(wrongB), String(wrongC)],
      i
    );

    cards.push({
      text: `Którym miesiącem w roku jest ${months[i]}?`,
      options,
      correctIndex
    });
  }

  const weekdays = [
    "poniedziałek",
    "wtorek",
    "środa",
    "czwartek",
    "piątek",
    "sobota",
    "niedziela"
  ];

  for (let i = 0; i < weekdays.length; i += 1) {
    const correct = i + 1;
    const wrongA = ((i + 2) % 7) + 1;
    const wrongB = ((i + 3) % 7) + 1;
    const wrongC = ((i + 5) % 7) + 1;
    const { options, correctIndex } = rotateOptions(
      String(correct),
      [String(wrongA), String(wrongB), String(wrongC)],
      i
    );

    cards.push({
      text: `Którym dniem tygodnia jest ${weekdays[i]}?`,
      options,
      correctIndex
    });
  }

  cards.push(...extraGeneralFacts);
  return cards.slice(0, 30);
}

function buildPriorityPrompts(): Array<{ text: string; options: [string, string, string, string] }> {
  const prompts: Array<{ text: string; options: [string, string, string, string] }> = [];

  for (const axis of priorityAxes) {
    for (const context of priorityContexts) {
      prompts.push({
        text: `${axis.stem} ${context}?`,
        options: axis.options
      });
    }
  }

  return prompts.slice(0, 40);
}

const scienceByCategory: Record<
  QuizCategory,
  Array<{ text: string; options: [string, string, string, string]; correctIndex: number }>
> = {
  matma: buildMathCards(),
  geografia: buildGeographyCards(),
  nauka: buildScienceCards(),
  "wiedza-ogolna": buildGeneralKnowledgeCards()
};

const prioritiesBuiltin = buildPriorityPrompts();

export function seedBuiltinQuestions(db: AppDatabase): void {
  db.seedBuiltinQuestions("qa-lightning", qaBuiltin);
  db.seedBuiltinQuestions("better-half", betterHalfBuiltin);

  for (const category of Object.keys(scienceByCategory) as QuizCategory[]) {
    db.seedScienceQuestions(category, scienceByCategory[category]);
  }

  db.seedPriorityPrompts(prioritiesBuiltin);
}

export function pickQuestions(
  db: AppDatabase,
  gameId: "qa-lightning" | "better-half",
  count: number
): QuestionCard[] {
  const selected = db.drawQuestions(gameId, count);
  return extendToCount(selected, count);
}

export function pickScienceQuestions(
  db: AppDatabase,
  category: QuizCategory,
  count: number
): Array<ScienceQuestionPrompt & { correctIndex: number }> {
  const selected = db.drawScienceQuestions(category, count);
  return extendToCount(selected, count);
}

export function pickPriorityPrompts(db: AppDatabase, count: number): CouplePromptCard[] {
  const selected = db.drawPriorityPrompts(count);
  return extendToCount(selected, count);
}

function extendToCount<T>(input: T[], count: number): T[] {
  if (input.length >= count) {
    return input.slice(0, count);
  }

  if (input.length === 0) {
    return [];
  }

  const next = [...input];
  while (next.length < count) {
    next.push(input[next.length % input.length]);
  }

  return next;
}
