import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  QuestionPack,
  RelationQuestionPackItem,
  ScienceQuestionPackItem,
  validateQuestionPack
} from "../../src/server/game/content/question-pack.schema";
import { fetchCountryCapitals } from "./sources/rest-countries";

type OptionTuple = [string, string, string, string];

const VERSION = "v1.10-question-pack-pl";

async function main(): Promise<void> {
  const qaLightning = buildQaLightning();
  const betterHalf = buildBetterHalf();
  const scienceQuiz = await buildScienceQuiz();
  const couplePriorities = buildCouplePriorities();

  const pack: QuestionPack = validateQuestionPack({
    version: VERSION,
    generatedAt: new Date().toISOString(),
    qaLightning,
    betterHalf,
    scienceQuiz,
    couplePriorities
  });

  const outputPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../src/server/game/content/question-pack.v1_10.pl.json"
  );

  fs.writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf-8");

  const report = [
    `Zapisano pack: ${outputPath}`,
    `qa-lightning: ${pack.qaLightning.length}`,
    `better-half: ${pack.betterHalf.length}`,
    `science/matma: ${pack.scienceQuiz.matma.length}`,
    `science/geografia: ${pack.scienceQuiz.geografia.length}`,
    `science/nauka: ${pack.scienceQuiz.nauka.length}`,
    `science/wiedza-ogolna: ${pack.scienceQuiz["wiedza-ogolna"].length}`,
    `couple-priorities: ${pack.couplePriorities.length}`
  ];

  // eslint-disable-next-line no-console
  console.log(report.join("\n"));
}

function buildQaLightning(): RelationQuestionPackItem[] {
  const themes: Array<{ headline: string; options: OptionTuple; contexts: string[] }> = [
    {
      headline: "Po intensywnym tygodniu co najlepiej resetuje głowę",
      options: ["Spokojny spacer", "Film/serial", "Drzemka", "Aktywność sportowa"],
      contexts: qaContexts("po pracy", "w sobotę", "w niedzielę", "gdy jest deszcz", "gdy jest słońce")
    },
    {
      headline: "Na spontaniczne wyjście we dwoje co wybierasz",
      options: ["Kawiarnia", "Spacer po mieście", "Planszówki", "Krótki wypad za miasto"],
      contexts: qaContexts("wieczorem", "po obiedzie", "w piątek", "w tygodniu", "w wolny poranek")
    },
    {
      headline: "Gdy planujecie wspólny budżet co ma pierwszeństwo",
      options: ["Oszczędności", "Wyjazdy", "Komfort codzienny", "Rozwój/hobby"],
      contexts: qaContexts("na początku miesiąca", "po wypłacie", "przed urlopem", "w spokojnym okresie", "w stresie")
    },
    {
      headline: "Który sposób komunikacji jest dla ciebie najwygodniejszy",
      options: ["Krótka rozmowa na żywo", "Wiadomość tekstowa", "Telefon", "Spokojna rozmowa wieczorem"],
      contexts: qaContexts("gdy trzeba szybko ustalić plan", "w ciągu dnia", "po pracy", "w weekend", "gdy temat jest ważny")
    },
    {
      headline: "Wspólne gotowanie jest najlepsze gdy",
      options: ["Gotujecie coś nowego", "Robicie szybki klasyk", "Każdy ma swoją rolę", "Improwizujecie z tego co jest"],
      contexts: qaContexts("w tygodniu", "w sobotę", "po treningu", "gdy macie gości", "w chłodny dzień")
    },
    {
      headline: "Na mały prezent bez okazji co działa najlepiej",
      options: ["Drobny gadżet praktyczny", "Ręcznie zrobiona rzecz", "Wspólne doświadczenie", "Słodka niespodzianka"],
      contexts: qaContexts("w środku tygodnia", "po ciężkim dniu", "rano", "wieczorem", "przed wyjazdem")
    },
    {
      headline: "Gdy macie wolną godzinę co jest najlepszą opcją",
      options: ["Szybki spacer", "Krótka gra", "Rozmowa przy herbacie", "Krótki trening"],
      contexts: qaContexts("po pracy", "w weekend", "przed snem", "po obiedzie", "rano")
    },
    {
      headline: "Przy planowaniu weekendu co najczęściej wygrywa",
      options: ["Nowe miejsce", "Spokojny odpoczynek", "Spotkanie ze znajomymi", "Domowe projekty"],
      contexts: qaContexts("latem", "zimą", "gdy pogoda dopisuje", "gdy jest napięty tydzień", "po dłuższym wyjeździe")
    },
    {
      headline: "Który styl organizacji dnia najbardziej ci pasuje",
      options: ["Szczegółowy plan", "Lista priorytetów", "Luźny szkic", "Pełna spontaniczność"],
      contexts: qaContexts("w tygodniu", "w weekend", "w okresie dużej pracy", "w czasie urlopu", "gdy jest dużo spraw")
    },
    {
      headline: "Na poprawę nastroju co działa najszybciej",
      options: ["Humor i żarty", "Zmiana otoczenia", "Chwila ciszy", "Muzyka"],
      contexts: qaContexts("po trudnym dniu", "w deszczowe popołudnie", "w poniedziałek", "w piątek wieczorem", "gdy brakuje energii")
    }
  ];

  const templates = [
    "{headline} {context}?",
    "{context}: {headline}?",
    "Jeśli {context}, to {headline}?",
    "{headline} — co wybierasz {context}?",
    "W sytuacji \"{context}\" {headline}?"
  ];

  return buildRelationalQuestions(themes, templates, 300);
}

function buildBetterHalf(): RelationQuestionPackItem[] {
  const themes: Array<{ headline: string; options: OptionTuple; contexts: string[] }> = [
    {
      headline: "jaką opcję najpewniej wybierze twój partner",
      options: ["Spokojny wieczór w domu", "Wyjście na miasto", "Aktywny spacer", "Nową aktywność"],
      contexts: qaContexts("po ciężkim dniu", "w piątek", "w niedzielę", "gdy jest zła pogoda", "gdy jest piękny dzień")
    },
    {
      headline: "co partner uzna za najlepszy sposób na wspólny reset",
      options: ["Krótki wyjazd", "Serial i herbata", "Sport", "Dłuższą rozmowę"],
      contexts: qaContexts("po stresującym tygodniu", "przed ważnym wydarzeniem", "po powrocie z pracy", "w weekend", "w chłodny wieczór")
    },
    {
      headline: "który plan partner wybierze na wolne popołudnie",
      options: ["Kawiarnia", "Muzeum/wystawa", "Planszówki", "Domowe gotowanie"],
      contexts: qaContexts("w mieście", "w nowej okolicy", "przy mniejszym budżecie", "przy większej energii", "gdy nie ma dużo czasu")
    },
    {
      headline: "na co partner postawi przy miesięcznym planie wydatków",
      options: ["Poduszka finansowa", "Wyjazdy i doświadczenia", "Komfort domu", "Rozwój i nauka"],
      contexts: qaContexts("na początku miesiąca", "po większym wydatku", "przed urlopem", "gdy pojawia się premia", "w zwykłym miesiącu")
    },
    {
      headline: "jak partner najchętniej rozwiązuje drobne konflikty",
      options: ["Od razu rozmową", "Po krótkiej przerwie", "Na spacerze", "Humorem i luzem"],
      contexts: qaContexts("gdy emocje są wysokie", "gdy to mała sprawa", "wieczorem", "w ciągu dnia", "w weekend")
    },
    {
      headline: "co partner uzna za najbardziej wartościowy gest",
      options: ["Uważne słuchanie", "Praktyczna pomoc", "Czas bez telefonów", "Miłą niespodziankę"],
      contexts: qaContexts("po trudnym dniu", "w środku tygodnia", "w rocznicę", "bez okazji", "gdy ma gorszy nastrój")
    },
    {
      headline: "jaki rytm dnia partner najchętniej wybiera",
      options: ["Mocny poranek", "Spokojny rozruch", "Aktywne popołudnie", "Wieczorne tempo"],
      contexts: qaContexts("w tygodniu pracy", "w weekend", "na urlopie", "w zimie", "latem")
    },
    {
      headline: "co partner wybierze jako plan randki",
      options: ["Kolacja i rozmowa", "Kino", "Spacer po nowym miejscu", "Wspólne hobby"],
      contexts: qaContexts("w piątek wieczór", "w sobotni poranek", "w niedzielę", "w rocznicę", "bez okazji")
    },
    {
      headline: "jak partner najchętniej organizuje ważne zadania",
      options: ["Lista kroków", "Podział na etapy", "Szybkie działanie", "Najpierw konsultacja"],
      contexts: qaContexts("gdy termin jest blisko", "gdy jest dużo czasu", "przy większym projekcie", "w pracy", "w domu")
    },
    {
      headline: "co partner wybierze gdy ma wolną godzinę",
      options: ["Krótki spacer", "Czytanie", "Grę", "Drzemkę"],
      contexts: qaContexts("po pracy", "w weekend", "przed snem", "rano", "po obiedzie")
    }
  ];

  const templates = [
    "Twoim zdaniem {headline} {context}?",
    "{context}: jak myślisz, {headline}?",
    "Jeśli {context}, to {headline}?",
    "{headline} — co przewidujesz {context}?",
    "W wariancie \"{context}\" {headline}?"
  ];

  return buildRelationalQuestions(themes, templates, 300);
}

async function buildScienceQuiz(): Promise<QuestionPack["scienceQuiz"]> {
  return {
    matma: buildMathScience(200),
    geografia: await buildGeographyScience(200),
    nauka: buildNatureScience(200),
    "wiedza-ogolna": buildGeneralScience(200)
  };
}

function buildMathScience(count: number): ScienceQuestionPackItem[] {
  const result: ScienceQuestionPackItem[] = [];

  for (let i = 0; i < 60; i += 1) {
    const a = 17 + i;
    const b = (i % 18) + 6;
    const correct = a + b;
    result.push(
      asScience(
        `Ile to ${a} + ${b} w zadaniu ${i + 1}?`,
        ...makeNumericOptions(correct, i),
        "matma"
      )
    );
  }

  for (let i = 0; i < 50; i += 1) {
    const a = 80 + i;
    const b = (i % 23) + 7;
    const correct = a - b;
    result.push(
      asScience(
        `Ile to ${a} - ${b} w zadaniu ${i + 61}?`,
        ...makeNumericOptions(correct, i + 80),
        "matma"
      )
    );
  }

  for (let i = 0; i < 40; i += 1) {
    const a = 3 + (i % 8);
    const b = 4 + Math.floor(i / 8);
    const correct = a * b;
    result.push(
      asScience(
        `Ile to ${a} × ${b} w zadaniu ${i + 111}?`,
        ...makeNumericOptions(correct, i + 140),
        "matma"
      )
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const value = 80 + i * 2;
    const percent = 10 + (i % 6) * 5;
    const correct = Math.round((value * percent) / 100);
    result.push(
      asScience(
        `Ile wynosi ${percent}% z ${value} w zadaniu ${i + 151}?`,
        ...makeNumericOptions(correct, i + 180),
        "matma"
      )
    );
  }

  for (let i = 0; i < 20; i += 1) {
    const start = 2 + i;
    const step = (i % 4) + 2;
    const sequence = [start, start + step, start + step * 2];
    const correct = start + step * 3;
    result.push(
      asScience(
        `Uzupełnij ciąg ${sequence.join(", ")} i wskaż kolejną liczbę w zadaniu ${i + 181}.`,
        ...makeNumericOptions(correct, i + 220),
        "matma"
      )
    );
  }

  return result.slice(0, count);
}

async function buildGeographyScience(count: number): Promise<ScienceQuestionPackItem[]> {
  const capitals = await fetchCountryCapitals();
  const result: ScienceQuestionPackItem[] = [];
  const countryTemplates = [
    "Jaka jest stolica państwa: {country}?",
    "Podaj stolicę kraju {country}.",
    "Które miasto pełni funkcję stolicy państwa {country}?",
    "Wskaż stolicę, gdy krajem jest {country}.",
    "Jeśli mówimy o państwie {country}, jaka jest jego stolica?"
  ];
  const capitalTemplates = [
    "Stolicą którego państwa jest {capital}?",
    "Który kraj ma stolicę w mieście {capital}?",
    "Wskaż państwo, którego stolicą jest {capital}.",
    "Do jakiego państwa należy stolica {capital}?",
    "Jeżeli stolicą jest {capital}, to jaki to kraj?"
  ];

  const firstBatch = capitals.slice(0, Math.min(120, capitals.length));
  for (let i = 0; i < firstBatch.length; i += 1) {
    const current = firstBatch[i];
    const distractors = pickThree(
      capitals.map((entry) => entry.capital),
      current.capital,
      i
    );

    result.push(
      asScience(
        countryTemplates[i % countryTemplates.length].replace("{country}", current.countryPl),
        ...rotateOptions(current.capital, distractors, i),
        "geografia"
      )
    );
  }

  for (let i = 0; i < Math.min(80, capitals.length); i += 1) {
    const current = capitals[i];
    const distractors = pickThree(
      capitals.map((entry) => entry.countryPl),
      current.countryPl,
      i + 120
    );

    result.push(
      asScience(
        capitalTemplates[i % capitalTemplates.length].replace("{capital}", current.capital),
        ...rotateOptions(current.countryPl, distractors, i + 120),
        "geografia"
      )
    );
  }

  const extras = [
    { q: "Który ocean jest największy powierzchniowo?", c: "Ocean Spokojny", w: ["Ocean Atlantycki", "Ocean Indyjski", "Ocean Arktyczny"] as [string, string, string] },
    { q: "Który kontynent ma największą powierzchnię?", c: "Azja", w: ["Afryka", "Europa", "Ameryka Północna"] as [string, string, string] },
    { q: "Która pustynia jest największa na świecie (nie licząc lodowych)?", c: "Sahara", w: ["Gobi", "Kalahari", "Atacama"] as [string, string, string] },
    { q: "Która rzeka jest najdłuższa na świecie według większości źródeł?", c: "Amazonka", w: ["Nil", "Missisipi", "Jangcy"] as [string, string, string] },
    { q: "Najwyższy szczyt Ziemi to", c: "Mount Everest", w: ["K2", "Kanczendzonga", "Lhotse"] as [string, string, string] }
  ];

  for (let i = 0; result.length < count; i += 1) {
    const extra = extras[i % extras.length];
    result.push(asScience(extra.q, ...rotateOptions(extra.c, extra.w, i + 400), "geografia"));
  }

  return result.slice(0, count);
}

function buildNatureScience(count: number): ScienceQuestionPackItem[] {
  const elementSymbols = [
    "H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca",
    "Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr",
    "Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba",
    "La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W",
    "Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U",
    "Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds",
    "Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"
  ];

  const result: ScienceQuestionPackItem[] = [];

  for (let i = 0; i < 118; i += 1) {
    const correct = elementSymbols[i];
    const distractors = pickThree(elementSymbols, correct, i);
    result.push(
      asScience(
        `Jaki symbol ma pierwiastek o liczbie atomowej ${i + 1}?`,
        ...rotateOptions(
          symbolLabel(correct),
          [
            symbolLabel(distractors[0]),
            symbolLabel(distractors[1]),
            symbolLabel(distractors[2])
          ],
          i
        ),
        "nauka"
      )
    );
  }

  for (let i = 0; i < 42; i += 1) {
    const symbol = elementSymbols[i + 10];
    const correct = String(i + 11);
    const wrongA = String(Math.max(1, i + 8));
    const wrongB = String(i + 15);
    const wrongC = String(i + 20);
    result.push(
      asScience(
        `Który numer atomowy ma pierwiastek o symbolu ${symbol} w pytaniu ${i + 1}?`,
        ...rotateOptions(correct, [wrongA, wrongB, wrongC], i + 120),
        "nauka"
      )
    );
  }

  const factual: Array<{ q: string; c: string; w: [string, string, string] }> = [
    { q: "Najbliższą Ziemi gwiazdą (poza Słońcem) jest", c: "Proxima Centauri", w: ["Syriusz", "Betelgeza", "Wega"] },
    { q: "Podstawową jednostką siły w układzie SI jest", c: "niuton", w: ["dżul", "wat", "paskal"] },
    { q: "Podstawową jednostką energii w SI jest", c: "dżul", w: ["wat", "niuton", "tesla"] },
    { q: "Za fotosyntezę u roślin odpowiada głównie", c: "chlorofil", w: ["keratyna", "hemoglobina", "melanina"] },
    { q: "Woda wrze przy ciśnieniu atmosferycznym w temperaturze", c: "100°C", w: ["90°C", "80°C", "120°C"] },
    { q: "DNA jest nośnikiem", c: "informacji genetycznej", w: ["tlenu we krwi", "energii cieplnej", "fotosyntezy"] },
    { q: "Jednostką częstotliwości jest", c: "herc", w: ["wolt", "candela", "tesla"] },
    { q: "Który narząd pompuje krew w organizmie człowieka?", c: "serce", w: ["wątroba", "trzustka", "śledziona"] },
    { q: "Gaz niezbędny do oddychania człowieka to", c: "tlen", w: ["azot", "wodór", "hel"] },
    { q: "Największą planetą Układu Słonecznego jest", c: "Jowisz", w: ["Saturn", "Mars", "Neptun"] },
    { q: "Naturalnym satelitą Ziemi jest", c: "Księżyc", w: ["Mars", "Wenus", "Europa"] },
    { q: "Proces przejścia cieczy w gaz to", c: "parowanie", w: ["krzepnięcie", "sublimacja", "skraplanie"] },
    { q: "Narząd odpowiedzialny za filtrację krwi to", c: "nerki", w: ["płuca", "żołądek", "trzustka"] },
    { q: "Najmniejszą jednostką informacji cyfrowej jest", c: "bit", w: ["bajt", "kilobajt", "megabit"] },
    { q: "Który gaz dominuje w atmosferze ziemskiej?", c: "azot", w: ["tlen", "argon", "dwutlenek węgla"] },
    { q: "U człowieka wymiana gazowa zachodzi głównie w", c: "pęcherzykach płucnych", w: ["oskrzelach", "tchawicy", "krtani"] },
    { q: "Jednostką napięcia elektrycznego jest", c: "wolt", w: ["amper", "om", "lumen"] },
    { q: "Jednostką oporu elektrycznego jest", c: "om", w: ["wolt", "tesla", "niuton"] },
    { q: "Za czerwone zabarwienie krwi odpowiada", c: "hemoglobina", w: ["insulina", "kolagen", "adrenalina"] },
    { q: "Skala pH określa", c: "kwasowość lub zasadowość", w: ["gęstość cieczy", "poziom tlenu", "przewodność cieplną"] },
    { q: "Planeta znana z pierścieni to", c: "Saturn", w: ["Wenus", "Merkury", "Mars"] },
    { q: "Zjawisko odbicia światła od powierzchni to", c: "refleksja", w: ["dyfuzja", "absorpcja", "sedymentacja"] },
    { q: "Wzór chemiczny wody to", c: "H2O", w: ["CO2", "O2", "NaCl"] },
    { q: "Główną funkcją mitochondriów jest", c: "produkcja energii", w: ["synteza białek", "transport tlenu", "trawienie tłuszczów"] },
    { q: "Ile chromosomów ma zdrowy człowiek w komórce somatycznej?", c: "46", w: ["23", "44", "48"] },
    { q: "Krew płynie z serca do płuc przez", c: "tętnicę płucną", w: ["żyłę główną", "aortę", "żyłę płucną"] },
    { q: "Ruch planet wokół Słońca jest skutkiem działania", c: "grawitacji", w: ["magnetyzmu", "tarcia", "promieniowania UV"] },
    { q: "Najlżejszym pierwiastkiem jest", c: "wodór", w: ["hel", "lit", "azot"] },
    { q: "Białkiem odpowiedzialnym za odporność są między innymi", c: "przeciwciała", w: ["enzymy trawienne", "hormony wzrostu", "hemoglobiny"] },
    { q: "Jednostką mocy jest", c: "wat", w: ["dżul", "niuton", "paskal"] },
    { q: "Ruch cząsteczek od większego do mniejszego stężenia to", c: "dyfuzja", w: ["osmoza", "krystalizacja", "destylacja"] },
    { q: "Cząstka elementarna o ładunku ujemnym to", c: "elektron", w: ["proton", "neutron", "foton"] }
  ];

  for (let i = 0; i < factual.length && result.length < count; i += 1) {
    const row = factual[i];
    result.push(asScience(row.q, ...rotateOptions(row.c, row.w, i + 200), "nauka"));
  }

  const unitTemplates = [
    "Ile metrów ma {km} kilometrów?",
    "Przelicz {km} km na metry.",
    "Wskaż liczbę metrów odpowiadającą {km} km.",
    "Jaką wartość w metrach ma odcinek {km} km?"
  ];

  for (let i = 1; result.length < count; i += 1) {
    const km = i;
    const correct = km * 1000;
    const template = unitTemplates[i % unitTemplates.length];
    const text = template.replace("{km}", String(km));
    result.push(asScience(text, ...makeNumericOptions(correct, i + 260), "nauka"));
  }

  return result.slice(0, count);
}

function buildGeneralScience(count: number): ScienceQuestionPackItem[] {
  const result: ScienceQuestionPackItem[] = [];
  const months = [
    "styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"
  ];
  const weekdays = ["poniedziałek","wtorek","środa","czwartek","piątek","sobota","niedziela"];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (let i = 0; i < months.length; i += 1) {
    const correct = String(i + 1);
    result.push(
      asScience(
        `Którym miesiącem roku jest ${months[i]}?`,
        ...rotateOptions(correct, numericDistractors(i + 1, 12), i),
        "wiedza-ogolna"
      )
    );
  }

  for (let i = 0; i < months.length; i += 1) {
    const correct = months[(i + 1) % 12];
    const candidates = pickThree(months, correct, i + 30);
    result.push(
      asScience(
        `Jaki miesiąc następuje po: ${months[i]}?`,
        ...rotateOptions(correct, candidates, i + 30),
        "wiedza-ogolna"
      )
    );
  }

  for (let i = 0; i < weekdays.length; i += 1) {
    const correct = String(i + 1);
    result.push(
      asScience(
        `Którym dniem tygodnia jest ${weekdays[i]} licząc od poniedziałku?`,
        ...rotateOptions(correct, numericDistractors(i + 1, 7), i + 70),
        "wiedza-ogolna"
      )
    );
  }

  const romanBase: Array<[number, string]> = [
    [4, "IV"], [5, "V"], [6, "VI"], [9, "IX"], [10, "X"], [14, "XIV"], [15, "XV"], [19, "XIX"],
    [20, "XX"], [24, "XXIV"], [29, "XXIX"], [30, "XXX"], [34, "XXXIV"], [39, "XXXIX"], [40, "XL"],
    [44, "XLIV"], [49, "XLIX"], [50, "L"], [60, "LX"], [70, "LXX"], [80, "LXXX"], [90, "XC"],
    [99, "XCIX"], [100, "C"]
  ];

  for (let i = 0; i < romanBase.length; i += 1) {
    const [value, roman] = romanBase[i];
    const variant = Math.max(1, value - ((i % 4) + 1));
    const variant2 = value + ((i % 5) + 1);
    const variant3 = value + ((i % 7) + 2);
    result.push(
      asScience(
        `Która liczba arabska odpowiada zapisowi rzymskiemu ${roman} w pytaniu ${i + 1}?`,
        ...rotateOptions(String(value), [String(variant), String(variant2), String(variant3)], i + 120),
        "wiedza-ogolna"
      )
    );
  }

  for (let i = 0; i < alphabet.length; i += 1) {
    const letter = alphabet[i];
    const correct = String(i + 1);
    result.push(
      asScience(
        `Którą literą alfabetu łacińskiego jest ${letter} w pozycji ${i + 1}?`,
        ...rotateOptions(correct, numericDistractors(i + 1, 26), i + 260),
        "wiedza-ogolna"
      )
    );
  }

  const monthDays: Record<string, number> = {
    styczeń: 31,
    luty: 28,
    marzec: 31,
    kwiecień: 30,
    maj: 31,
    czerwiec: 30,
    lipiec: 31,
    sierpień: 31,
    wrzesień: 30,
    październik: 31,
    listopad: 30,
    grudzień: 31
  };

  for (let i = 0; i < months.length; i += 1) {
    const month = months[i];
    const correct = String(monthDays[month]);
    result.push(
      asScience(
        `Ile dni ma miesiąc: ${month} w roku nieprzestępnym?`,
        ...rotateOptions(correct, [correct === "31" ? "30" : "31", "28", "29"], i + 320),
        "wiedza-ogolna"
      )
    );
  }

  for (let i = 0; i < months.length; i += 1) {
    const month = months[i];
    const quarter = String(Math.floor(i / 3) + 1);
    result.push(
      asScience(
        `Do którego kwartału roku należy ${month}?`,
        ...rotateOptions(quarter, numericDistractors(Number(quarter), 4), i + 360),
        "wiedza-ogolna"
      )
    );
  }

  const timeTemplates = [
    "Która godzina będzie za {shift} godzin, jeśli teraz jest {hour}:00?",
    "Po {shift} godzinach od {hour}:00 wskaż poprawny czas.",
    "Jeśli jest {hour}:00, to która będzie godzina po {shift} h?",
    "Jaki czas otrzymasz dodając {shift} godzin do {hour}:00?"
  ];

  for (let i = 0; result.length < count; i += 1) {
    const hour = (6 + i * 3) % 24;
    const shift = i + 1;
    const correctHour = (hour + shift) % 24;
    const format = (value: number) => `${String(value).padStart(2, "0")}:00`;
    const text = timeTemplates[i % timeTemplates.length]
      .replace("{shift}", String(shift))
      .replace("{hour}", String(hour).padStart(2, "0"));
    const uniqueText = `${text} (seria ${i + 1})`;

    const wrongA = format((correctHour + 1) % 24);
    const wrongB = format((correctHour + 2) % 24);
    const wrongC = format((correctHour + 12) % 24);

    result.push(
      asScience(
        uniqueText,
        ...rotateOptions(format(correctHour), [wrongA, wrongB, wrongC], i + 420),
        "wiedza-ogolna"
      )
    );
  }

  return result.slice(0, count);
}

function buildCouplePriorities(): RelationQuestionPackItem[] {
  const contexts = [
    "w codziennym życiu",
    "w tygodniu pracy",
    "podczas wyjazdu",
    "w sytuacji stresu"
  ];

  const subjects = [
    "planowanie czasu",
    "budowanie bliskości",
    "dbanie o zdrowie",
    "organizacja domu",
    "wspólne finanse",
    "wspólny rozwój",
    "odpoczynek po pracy",
    "komunikacja",
    "rozwiązywanie sporów",
    "wspólne decyzje",
    "podział obowiązków"
  ];

  const intents = [
    "co daje wam największą stabilność",
    "co najbardziej poprawia wasz nastrój",
    "co najmocniej buduje zaufanie",
    "co daje najlepszy efekt długofalowo",
    "co jest najbardziej praktyczne"
  ];

  const optionSets: OptionTuple[] = [
    ["Regularna rozmowa", "Jasny plan", "Elastyczność", "Wspólny rytuał"],
    ["Spokojna analiza", "Szybka decyzja", "Konsultacja obu stron", "Odkładanie na później"],
    ["Aktywność fizyczna", "Czas offline", "Hobby", "Spotkanie z bliskimi"],
    ["Priorytety tygodnia", "Szczegółowy harmonogram", "Plan minimum", "Spontaniczne podejście"],
    ["Budżet i kontrola", "Elastyczny fundusz", "Inwestycja w doświadczenia", "Oszczędzanie celu"]
  ];

  const axes: Array<{ text: string; options: OptionTuple }> = [];
  let axisIndex = 0;
  for (const subject of subjects) {
    for (const intent of intents) {
      axes.push({
        text: `W obszarze \"${subject}\" ${intent}?`,
        options: optionSets[axisIndex % optionSets.length]
      });
      axisIndex += 1;
    }
  }

  const prompts: RelationQuestionPackItem[] = [];
  let seed = 0;

  for (const axis of axes) {
    for (const context of contexts) {
      const [a, b, c, d] = axis.options;
      const rotated = rotateTuple([a, b, c, d], seed);
      prompts.push({
        text: `${axis.text} Jak ustawisz priorytet ${context}?`,
        options: rotated
      });
      seed += 1;
    }
  }

  return prompts.slice(0, 220);
}

function buildRelationalQuestions(
  themes: Array<{ headline: string; options: OptionTuple; contexts: string[] }>,
  templates: string[],
  target: number
): RelationQuestionPackItem[] {
  const output: RelationQuestionPackItem[] = [];
  let seed = 0;
  const focusWords = [
    "komfort",
    "energia",
    "tempo",
    "spokój",
    "praktyka",
    "bliskość",
    "elastyczność",
    "lekkość",
    "działanie",
    "regeneracja",
    "równowaga",
    "rytuał",
    "ułatwienie",
    "spontan",
    "plan",
    "harmonia",
    "klarowność",
    "wygoda",
    "oddech",
    "fokus",
    "współpraca",
    "kontakt",
    "refleks",
    "stabilność",
    "zaufanie",
    "odpoczynek",
    "dynamika",
    "detal",
    "progres",
    "synergia"
  ];

  for (const theme of themes) {
    for (let i = 0; i < theme.contexts.length; i += 1) {
      const template = templates[(seed + i) % templates.length];
      const text = template
        .replace("{headline}", theme.headline)
        .replace("{context}", theme.contexts[i]);
      const focus = focusWords[(seed * 31 + i * 17) % focusWords.length];
      const withFocus = text.replace(/\?$/, ` · ${focus}?`);

      output.push({
        text: normalizeQuestion(withFocus),
        options: rotateTuple(theme.options, seed + i)
      });
    }
    seed += 1;
  }

  if (output.length >= target) {
    return output.slice(0, target);
  }

  throw new Error(`Za mało wygenerowanych pytań: ${output.length}/${target}`);
}

function rotateTuple(tuple: OptionTuple, seed: number): OptionTuple {
  const shift = seed % 4;
  return [...tuple.slice(shift), ...tuple.slice(0, shift)] as OptionTuple;
}

function rotateOptions(
  correct: string,
  distractors: [string, string, string],
  seed: number
): [OptionTuple, number] {
  const correctSafe = sanitizeOption(correct);
  const validDistractors = enforceThreeDistinctDistractors(correctSafe, distractors, seed);
  const base: OptionTuple = [correctSafe, validDistractors[0], validDistractors[1], validDistractors[2]];
  const rotated = rotateTuple(base, seed);
  return [rotated, rotated.indexOf(correctSafe)];
}

function asScience(
  text: string,
  optionData: OptionTuple,
  correctIndex: number,
  _category: "matma" | "geografia" | "nauka" | "wiedza-ogolna"
): ScienceQuestionPackItem {
  return {
    text: normalizeQuestion(text),
    options: optionData,
    correctIndex
  };
}

function makeNumericOptions(correct: number, seed: number): [OptionTuple, number] {
  const distractorValues: number[] = [];
  let cursor = 1;

  while (distractorValues.length < 3) {
    const direction = (seed + cursor) % 2 === 0 ? 1 : -1;
    const step = ((seed + cursor * 7) % 11) + 1;
    const candidate = Math.max(0, correct + direction * step);

    if (candidate !== correct && !distractorValues.includes(candidate)) {
      distractorValues.push(candidate);
    }

    cursor += 1;
  }

  return rotateOptions(
    String(correct),
    [String(distractorValues[0]), String(distractorValues[1]), String(distractorValues[2])],
    seed
  );
}

function pickThree(pool: string[], correct: string, seed: number): [string, string, string] {
  const seen = new Set<string>();
  const distinct = pool.filter((value) => {
    const trimmed = value.trim();
    const key = normalizeOptionKey(trimmed);
    if (!trimmed || key === normalizeOptionKey(correct) || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const length = distinct.length;
  if (length < 3) {
    return ["Opcja A", "Opcja B", "Opcja C"];
  }

  const a = distinct[seed % length];
  const b = distinct[(seed + 17) % length];
  const c = distinct[(seed + 39) % length];

  if (new Set([a, b, c]).size === 3) {
    return [a, b, c];
  }

  for (let i = 0; i < length; i += 1) {
    const x = distinct[(seed + i) % length];
    const y = distinct[(seed + i + 11) % length];
    const z = distinct[(seed + i + 29) % length];
    if (new Set([x, y, z]).size === 3) {
      return [x, y, z];
    }
  }

  return [distinct[0], distinct[1], distinct[2]];
}

function numericDistractors(correct: number, max: number): [string, string, string] {
  const values: number[] = [];
  let delta = 1;
  while (values.length < 3) {
    const candidate = ((correct + delta - 1) % max) + 1;
    if (candidate !== correct && !values.includes(candidate)) {
      values.push(candidate);
    }
    delta += 1;
  }

  return [String(values[0]), String(values[1]), String(values[2])];
}

function qaContexts(...groups: string[]): string[] {
  const slots = [
    "w spokojny dzień",
    "gdy macie mało czasu",
    "w luźny wieczór",
    "przed dłuższym weekendem",
    "gdy chcecie poprawić nastrój",
    "kiedy trzeba szybko podjąć decyzję",
    "po powrocie z pracy",
    "przed snem",
    "w sobotni poranek",
    "w niedzielne popołudnie",
    "gdy jedno z was ma mniej energii",
    "gdy oboje jesteście wypoczęci",
    "w krótkiej przerwie w ciągu dnia",
    "przy małym budżecie",
    "gdy budżet nie jest ograniczeniem",
    "w tygodniu pełnym spotkań",
    "po intensywnym treningu",
    "w chłodny wieczór",
    "w ciepły letni dzień",
    "gdy pada deszcz",
    "gdy świeci słońce",
    "kiedy chcecie poznawać nowe miejsca",
    "kiedy wolicie zostać blisko domu",
    "przed ważnym wydarzeniem",
    "po długim dniu zadań",
    "w okresie większego stresu",
    "gdy wszystko idzie zgodnie z planem",
    "kiedy macie ochotę na coś nowego",
    "kiedy stawiacie na sprawdzony schemat",
    "gdy priorytetem jest odpoczynek",
    "gdy priorytetem jest działanie",
    "w dniu bez zobowiązań",
    "gdy zostało tylko 60 minut wolnego czasu"
  ];

  return [...new Set([...groups, ...slots])].slice(0, 30);
}

function normalizeQuestion(input: string): string {
  return input.replace(/\s+/g, " ").replace(/\s+\?/g, "?").trim();
}

function symbolLabel(symbol: string): string {
  return `Symbol ${symbol}`;
}

function sanitizeOption(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return "Opcja";
  }

  if (/^\d$/.test(trimmed)) {
    return `0${trimmed}`;
  }

  if (trimmed.length === 1 && /^[A-Za-z]$/.test(trimmed)) {
    return `Symbol ${trimmed.toUpperCase()}`;
  }

  return trimmed;
}

function normalizeOptionKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function enforceThreeDistinctDistractors(
  correct: string,
  distractors: [string, string, string],
  seed: number
): [string, string, string] {
  const output: string[] = [];
  const used = new Set<string>([normalizeOptionKey(correct)]);

  for (const candidate of distractors) {
    const sanitized = sanitizeOption(candidate);
    const key = normalizeOptionKey(sanitized);
    if (!key || used.has(key)) {
      continue;
    }

    used.add(key);
    output.push(sanitized);
  }

  let fallbackIndex = 0;
  while (output.length < 3) {
    const candidate = `Wariant ${seed + fallbackIndex + 1}`;
    const key = normalizeOptionKey(candidate);
    if (!used.has(key)) {
      used.add(key);
      output.push(candidate);
    }
    fallbackIndex += 1;
  }

  return [output[0], output[1], output[2]];
}

void main();
