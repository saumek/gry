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

const VERSION = "v1.10.1-question-pack-pl";

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
  const result: ScienceQuestionPackItem[] = [
    ...buildPolynomialQuestions(),
    ...buildRationalExpressionQuestions(),
    ...buildSequenceQuestions()
  ];

  if (result.length < count) {
    throw new Error(`Za mało pytań z matematyki: ${result.length}/${count}`);
  }

  return result.slice(0, count);
}

function buildPolynomialQuestions(): ScienceQuestionPackItem[] {
  const result: ScienceQuestionPackItem[] = [];
  const degreeTemplates = [
    "Jaki stopień ma wielomian W(x)={poly}?",
    "Wskaż stopień wielomianu {poly}.",
    "Ile wynosi stopień wielomianu P(x)={poly}?",
    "Najwyższa potęga w wielomianie {poly} to"
  ];
  const valueTemplates = [
    "Ile wynosi W({x}), jeśli W(x)={poly}?",
    "Oblicz wartość wielomianu {poly} dla x={x}.",
    "Podstaw x={x} do wielomianu {poly}. Jaki jest wynik?",
    "Wartość wielomianu {poly} dla argumentu {x} to"
  ];
  const factorTemplates = [
    "Który rozkład na czynniki jest poprawny dla {poly}?",
    "Jak poprawnie rozłożyć na czynniki wielomian {poly}?",
    "Wskaż prawidłowy rozkład na czynniki dla {poly}.",
    "Poprawny rozkład wielomianu {poly} ma postać"
  ];
  const remainderTemplates = [
    "Jaka jest reszta z dzielenia {poly} przez {divisor}?",
    "Wskaż resztę z dzielenia wielomianu {poly} przez {divisor}.",
    "Ile wynosi reszta po podzieleniu {poly} przez {divisor}?",
    "Reszta z dzielenia wielomianu {poly} przez {divisor} to"
  ];
  const rootsTemplates = [
    "Ile wynosi {metric} równania {poly}=0?",
    "Wskaż {metric} równania {poly}=0.",
    "Dla równania {poly}=0 oblicz {metric}.",
    "Jaka jest wartość: {metric} dla równania {poly}=0?"
  ];
  const parameterTemplates = [
    "Dla jakiego b liczba {x} jest miejscem zerowym wielomianu W(x)={poly}?",
    "Wskaż b, dla którego {x} zeruje wielomian {poly}.",
    "Jeśli {x} jest miejscem zerowym wielomianu {poly}, to b jest równe",
    "Jaka wartość b sprawia, że {x} jest pierwiastkiem wielomianu {poly}?"
  ];

  for (let i = 0; i < 10; i += 1) {
    const degree = 3 + (i % 4);
    const poly = `${2 + (i % 3)}x^${degree}${formatSignedTerm(-(i % 5 + 1), degree - 1)}${formatSignedTerm(
      i % 4 + 2,
      Math.max(1, degree - 2)
    )}${formatConstant(i % 7 + 1)}`;
    const correct = `stopień ${degree}`;
    pushScienceQuestion(
      result,
      degreeTemplates[i % degreeTemplates.length].replace("{poly}", poly),
      correct,
      [
        `stopień ${degree - 1}`,
        `stopień ${Math.max(1, degree - 2)}`,
        `stopień ${degree + 1}`
      ],
      i
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const x = [-2, -1, 2, 3][i % 4];
    const a = 2 + (i % 3);
    const b = -5 + i;
    const c = 3 + (i % 4);
    const value = a * x * x + b * x + c;
    const poly = `${a}x^2${formatLinearTerm(b)}${formatConstant(c)}`;
    pushScienceQuestion(
      result,
      valueTemplates[i % valueTemplates.length]
        .replaceAll("{poly}", poly)
        .replaceAll("{x}", String(x)),
      `wartość ${value}`,
      [`wartość ${value + 1}`, `wartość ${value - 2}`, `wartość ${value + 3}`],
      i + 20
    );
  }

  const factorPairs: Array<[number, number]> = [
    [1, 3],
    [2, 5],
    [3, 4],
    [1, -2],
    [2, -3],
    [4, -1],
    [5, 2],
    [-1, -4],
    [-2, -5],
    [3, -1]
  ];
  for (let i = 0; i < factorPairs.length; i += 1) {
    const [p, q] = factorPairs[i];
    const sum = p + q;
    const product = p * q;
    const poly = `x^2${formatLinearTerm(-sum)}${formatConstant(product)}`;
    const correct = `${factorTerm(p)}${factorTerm(q)}`;
    pushScienceQuestion(
      result,
      factorTemplates[i % factorTemplates.length].replace("{poly}", poly),
      correct,
      [`${factorTerm(-p)}${factorTerm(q)}`, `${factorTerm(p)}${factorTerm(-q)}`, `${factorTerm(-p)}${factorTerm(-q)}`],
      i + 40
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const r = [-2, -1, 1, 2, 3][i % 5];
    const a = -3 + i;
    const b = 2 + (i % 5);
    const c = -4 + i;
    const poly = `x^3${formatSignedTerm(a, 2)}${formatLinearTerm(b)}${formatConstant(c)}`;
    const remainder = r ** 3 + a * r * r + b * r + c;
    pushScienceQuestion(
      result,
      remainderTemplates[i % remainderTemplates.length]
        .replace("{poly}", poly)
        .replace("{divisor}", divisorLabel(r)),
      `reszta ${remainder}`,
      [`reszta ${remainder + 1}`, `reszta ${remainder - 2}`, `reszta ${remainder + 4}`],
      i + 60
    );
  }

  for (let i = 0; i < factorPairs.length; i += 1) {
    const [p, q] = factorPairs[i];
    const sum = p + q;
    const product = p * q;
    const metric = i % 2 === 0 ? "sumę pierwiastków" : "iloczyn pierwiastków";
    const answer = i % 2 === 0 ? `suma ${sum}` : `iloczyn ${product}`;
    const wrongA = i % 2 === 0 ? `suma ${product}` : `iloczyn ${sum}`;
    const wrongB = i % 2 === 0 ? `suma ${sum + 1}` : `iloczyn ${product + 1}`;
    const wrongC = i % 2 === 0 ? `suma ${sum - 2}` : `iloczyn ${product - 2}`;
    pushScienceQuestion(
      result,
      rootsTemplates[i % rootsTemplates.length]
        .replace("{metric}", metric)
        .replace("{poly}", `x^2${formatLinearTerm(-sum)}${formatConstant(product)}`),
      answer,
      [wrongA, wrongB, wrongC],
      i + 80
    );
  }

  const parameterCases = [
    { x: 1, c: -6, kind: "quad" },
    { x: -1, c: 4, kind: "quad" },
    { x: 2, c: -8, kind: "quad_even" },
    { x: -2, c: 8, kind: "quad_even" },
    { x: 1, c: -3, kind: "cubic" },
    { x: -1, c: 5, kind: "cubic" },
    { x: 2, c: -12, kind: "quad_even" },
    { x: -1, c: -2, kind: "quad" },
    { x: 1, c: 7, kind: "quad" },
    { x: -2, c: -4, kind: "quad_even" }
  ] as const;

  for (let i = 0; i < parameterCases.length; i += 1) {
    const item = parameterCases[i];
    let poly = "";
    let b = 0;
    if (item.kind === "cubic") {
      b = -(item.x ** 3 + item.c) / item.x;
      poly = `x^3+bx${formatConstant(item.c)}`;
    } else {
      b = -((item.x ** 2) + item.c) / item.x;
      poly = `x^2+bx${formatConstant(item.c)}`;
    }

    pushScienceQuestion(
      result,
      parameterTemplates[i % parameterTemplates.length]
        .replaceAll("{x}", String(item.x))
        .replace("{poly}", poly),
      `b=${b}`,
      [`b=${b + 1}`, `b=${b - 2}`, `b=${b + 3}`],
      i + 100
    );
  }

  return result;
}

function buildRationalExpressionQuestions(): ScienceQuestionPackItem[] {
  const result: ScienceQuestionPackItem[] = [];
  const domainTemplates = [
    "Jaka jest dziedzina wyrażenia {expr}?",
    "Wskaż dziedzinę wyrażenia {expr}.",
    "Dla jakich x wyrażenie {expr} ma sens?",
    "Które ograniczenie opisuje dziedzinę wyrażenia {expr}?"
  ];
  const simplifyTemplates = [
    "Jak upraszcza się wyrażenie {expr}?",
    "Wskaż uproszczoną postać wyrażenia {expr}.",
    "Po skróceniu wyrażenia {expr} otrzymujemy",
    "Jaka jest najprostsza postać wyrażenia {expr}?"
  ];
  const equationTemplates = [
    "Rozwiąż równanie {expr}.",
    "Wskaż rozwiązanie równania {expr}.",
    "Jaka liczba spełnia równanie {expr}?",
    "Rozwiązaniem równania {expr} jest"
  ];

  for (let i = 0; i < 10; i += 1) {
    const k = 2 + i;
    const expr = `(x+${k})/(x-${k - 1})`;
    pushScienceQuestion(
      result,
      domainTemplates[i % domainTemplates.length].replace("{expr}", expr),
      `x != ${k - 1}`,
      [`x != ${k}`, `x != ${-(k - 1)}`, `x dowolne`],
      i + 140
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const s = 2 + i;
    const expr = `(x+${i + 1})/(x^2-${s * s})`;
    pushScienceQuestion(
      result,
      domainTemplates[(i + 1) % domainTemplates.length].replace("{expr}", expr),
      `x != ${s} i x != ${-s}`,
      [`x != ${s}`, `x != ${-s}`, `x > ${-s}`],
      i + 160
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const s = 2 + i;
    const expr = `(x^2-${s * s})/(x-${s}) dla x != ${s}`;
    pushScienceQuestion(
      result,
      simplifyTemplates[i % simplifyTemplates.length].replace("{expr}", expr),
      `x+${s}`,
      [`x-${s}`, `x^2-${s * s}`, `${2 * s}`],
      i + 180
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const m = 2 + i;
    const expr = `(x^2+${m}x)/x dla x != 0`;
    pushScienceQuestion(
      result,
      `${simplifyTemplates[(i + 1) % simplifyTemplates.length].replace("{expr}", expr)} Współczynnik liniowy to ${m}.`,
      `x+${m}`,
      [`x-${m}`, `${m}x`, `x^2+${m}`],
      i + 200
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const a = 1 + i;
    const b = 2 + (i % 4);
    const solution = a + 2 * b;
    const expr = `(x+${a})/(x-${b})=2`;
    pushScienceQuestion(
      result,
      equationTemplates[i % equationTemplates.length].replace("{expr}", expr),
      `x=${solution}`,
      [`x=${solution - 1}`, `x=${solution + 2}`, `x=${b}`],
      i + 220
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const top = 4 + i;
    const shift = 1 + (i % 5);
    const solution = top - shift;
    const expr = `${top}/(x+${shift})=1`;
    pushScienceQuestion(
      result,
      equationTemplates[(i + 1) % equationTemplates.length].replace("{expr}", expr),
      `x=${solution}`,
      [`x=${solution + 1}`, `x=${solution - 2}`, `x=${-shift}`],
      i + 240
    );
  }

  return result;
}

function buildSequenceQuestions(): ScienceQuestionPackItem[] {
  const result: ScienceQuestionPackItem[] = [];
  const arithmeticTermTemplates = [
    "W ciągu arytmetycznym pierwszy wyraz wynosi {a1}, a różnica {r}. Ile wynosi wyraz numer {n}?",
    "Dany jest ciąg arytmetyczny o pierwszym wyrazie {a1} i różnicy {r}. Oblicz wyraz numer {n}.",
    "Jeśli pierwszy wyraz ciągu arytmetycznego to {a1}, a różnica jest równa {r}, to ile wynosi wyraz numer {n}?",
    "Która liczba jest wyrazem numer {n} ciągu arytmetycznego, gdy pierwszy wyraz to {a1}, a różnica {r}?"
  ];
  const arithmeticDiffTemplates = [
    "W ciągu arytmetycznym pierwszy wyraz wynosi {a1}, a wyraz numer {n} jest równy {an}. Ile wynosi różnica?",
    "Znajdź różnicę ciągu arytmetycznego, jeśli pierwszy wyraz to {a1}, a wyraz numer {n} ma wartość {an}.",
    "Jaka jest różnica r w ciągu arytmetycznym, gdzie pierwszy wyraz wynosi {a1}, a wyraz numer {n} jest równy {an}?",
    "Oblicz różnicę ciągu arytmetycznego z warunków: pierwszy wyraz {a1}, wyraz numer {n} równy {an}."
  ];
  const arithmeticSumTemplates = [
    "Ile wynosi suma pierwszych {n} wyrazów ciągu arytmetycznego: {seq}?",
    "Oblicz sumę {n} początkowych wyrazów ciągu {seq}.",
    "Wskaż sumę pierwszych {n} wyrazów ciągu arytmetycznego {seq}.",
    "Suma pierwszych {n} wyrazów ciągu {seq} jest równa"
  ];
  const geometricTermTemplates = [
    "W ciągu geometrycznym pierwszy wyraz wynosi {a1}, a iloraz {q}. Ile wynosi wyraz numer {n}?",
    "Dany jest ciąg geometryczny o pierwszym wyrazie {a1} i ilorazie {q}. Oblicz wyraz numer {n}.",
    "Jeśli pierwszy wyraz ciągu geometrycznego to {a1}, a iloraz jest równy {q}, to ile wynosi wyraz numer {n}?",
    "Która liczba jest wyrazem numer {n} ciągu geometrycznego, gdy pierwszy wyraz to {a1}, a iloraz {q}?"
  ];
  const geometricRatioTemplates = [
    "W ciągu geometrycznym pierwszy wyraz wynosi {a1}, a wyraz numer {n} jest równy {an}. Ile wynosi iloraz?",
    "Znajdź iloraz ciągu geometrycznego, jeśli pierwszy wyraz to {a1}, a wyraz numer {n} ma wartość {an}.",
    "Jaki iloraz ma ciąg geometryczny, w którym pierwszy wyraz wynosi {a1}, a wyraz numer {n} jest równy {an}?",
    "Oblicz iloraz q dla ciągu geometrycznego z warunków: pierwszy wyraz {a1}, wyraz numer {n} równy {an}."
  ];
  const geometricSumTemplates = [
    "Ile wynosi suma pierwszych {n} wyrazów ciągu geometrycznego: {seq}?",
    "Oblicz sumę {n} początkowych wyrazów ciągu {seq}.",
    "Wskaż sumę pierwszych {n} wyrazów ciągu geometrycznego {seq}.",
    "Suma pierwszych {n} wyrazów ciągu {seq} jest równa"
  ];
  const arithmeticTermContexts = [
    "tabeli wartości",
    "notatki klasowej",
    "arkusza ćwiczeń",
    "osi liczbowej",
    "planu rat",
    "zestawu powtórkowego",
    "próbnego arkusza",
    "analizy danych",
    "szkolnego sprawdzianu",
    "zadania domowego"
  ];
  const arithmeticDiffContexts = [
    "pierwszej serii",
    "drugiej serii",
    "arkusza A",
    "arkusza B",
    "krótkiej powtórki",
    "notatnika ucznia",
    "wersji rozszerzonej",
    "zestawu próbnego",
    "zadania konkursowego",
    "powtórzenia przed klasówką"
  ];
  const geometricTermContexts = [
    "modelu wzrostu",
    "zadania z potęgami",
    "notatki o ilorazie",
    "ćwiczenia z szeregiem",
    "arkusza próbnego",
    "powtórki do sprawdzianu",
    "zadania domowego",
    "przykładu z tablicy",
    "zestawu maturalnego",
    "karty pracy"
  ];
  const geometricRatioContexts = [
    "wariantu podstawowego",
    "wariantu rozszerzonego",
    "serii A",
    "serii B",
    "powtórki działu",
    "szkolnej notatki",
    "ćwiczenia z zeszytu",
    "próbnego zestawu",
    "dodatkowego zadania",
    "krótkiego quizu"
  ];

  for (let i = 0; i < 10; i += 1) {
    const a1 = 4 + i;
    const r = [-3, -2, 2, 3][i % 4];
    const n = 4 + (i % 4);
    const value = a1 + (n - 1) * r;
    pushScienceQuestion(
      result,
      `${arithmeticTermTemplates[i % arithmeticTermTemplates.length]
        .replaceAll("{a1}", String(a1))
        .replaceAll("{r}", String(r))
        .replaceAll("{n}", String(n))} Rozważ numer n=${n} w ${arithmeticTermContexts[i]}.`,
      `a${n}=${value}`,
      [`a${n}=${value + 2}`, `a${n}=${value - 3}`, `a${n}=${value + 4}`],
      i + 260
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const a1 = 2 + i;
    const r = [-2, 3, 4, -3][i % 4];
    const n = 5 + (i % 3);
    const an = a1 + (n - 1) * r;
    pushScienceQuestion(
      result,
      `${arithmeticDiffTemplates[i % arithmeticDiffTemplates.length]
        .replaceAll("{a1}", String(a1))
        .replaceAll("{n}", String(n))
        .replaceAll("{an}", String(an))} Tutaj n=${n} w ${arithmeticDiffContexts[i]}.`,
      `r=${r}`,
      [`r=${r + 1}`, `r=${r - 2}`, `r=${an - a1}`],
      i + 280
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const a1 = 3 + i;
    const r = 2 + (i % 3);
    const n = 5;
    const seq = [a1, a1 + r, a1 + 2 * r, a1 + 3 * r, a1 + 4 * r];
    const sum = seq.reduce((total, value) => total + value, 0);
    pushScienceQuestion(
      result,
      arithmeticSumTemplates[i % arithmeticSumTemplates.length]
        .replaceAll("{n}", String(n))
        .replace("{seq}", seq.join(", ")),
      `suma ${sum}`,
      [`suma ${sum + 5}`, `suma ${sum - 4}`, `suma ${seq[4]}`],
      i + 300
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const a1 = 2 + (i % 4);
    const q = [-2, 2, 3, 1 / 2][i % 4];
    const qLabel = q === 1 / 2 ? "1/2" : String(q);
    const n = 4 + (i % 3);
    const value = a1 * q ** (n - 1);
    pushScienceQuestion(
      result,
      `${geometricTermTemplates[i % geometricTermTemplates.length]
        .replaceAll("{a1}", String(a1))
        .replaceAll("{q}", qLabel)
        .replaceAll("{n}", String(n))} Liczymy wyraz dla n=${n} w ${geometricTermContexts[i]}.`,
      `a${n}=${formatNumericValue(value)}`,
      [
        `a${n}=${formatNumericValue(value * (q === 1 / 2 ? 2 : q))}`,
        `a${n}=${formatNumericValue(value + 2)}`,
        `a${n}=${formatNumericValue(value - 3)}`
      ],
      i + 320
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const q = [2, 3, -2, 1 / 2][i % 4];
    const qLabel = q === 1 / 2 ? "1/2" : String(q);
    const a1 = q === 1 / 2 ? 32 + i * 2 : 2 + i;
    const n = 4;
    const an = a1 * q ** (n - 1);
    pushScienceQuestion(
      result,
      `${geometricRatioTemplates[i % geometricRatioTemplates.length]
        .replaceAll("{a1}", String(a1))
        .replaceAll("{n}", String(n))
        .replaceAll("{an}", formatNumericValue(an))} W tym zadaniu n=${n} w ${geometricRatioContexts[i]}.`,
      `q=${qLabel}`,
      [`q=${q === 1 / 2 ? "2" : formatNumericValue(q + 1)}`, `q=${q === 1 / 2 ? "-1/2" : formatNumericValue(q - 1)}`, "q=1"],
      i + 340
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const a1 = 1 + (i % 3);
    const q = 2;
    const n = 4 + (i % 2);
    const seq = Array.from({ length: n }, (_, index) => a1 * q ** index);
    const sum = seq.reduce((total, value) => total + value, 0);
    pushScienceQuestion(
      result,
      geometricSumTemplates[i % geometricSumTemplates.length]
        .replaceAll("{n}", String(n))
        .replace("{seq}", seq.join(", ")),
      `suma ${sum}`,
      [`suma ${sum + 3}`, `suma ${sum - 2}`, `suma ${seq[n - 1]}`],
      i + 360
    );
  }

  const theoryQuestions = [
    {
      text: "Który wzór opisuje n-ty wyraz ciągu arytmetycznego?",
      correct: "a_n=a_1+(n-1)r",
      wrong: ["a_n=a_1*r^(n-1)", "a_n=a_1+n*r", "a_n=r^(n-1)"]
    },
    {
      text: "Który wzór opisuje n-ty wyraz ciągu geometrycznego?",
      correct: "a_n=a_1*q^(n-1)",
      wrong: ["a_n=a_1+(n-1)q", "a_n=q^(n+a_1)", "a_n=a_1*n*q"]
    },
    {
      text: "Jeżeli różnica ciągu arytmetycznego jest ujemna, to ciąg jest",
      correct: "malejący",
      wrong: ["rosnący", "stały", "okresowy"]
    },
    {
      text: "Jeżeli iloraz ciągu geometrycznego jest równy 1, to ciąg jest",
      correct: "stały",
      wrong: ["malejący", "rosnący", "naprzemienny"]
    },
    {
      text: "Który z podanych ciągów jest arytmetyczny?",
      correct: "4, 7, 10, 13",
      wrong: ["2, 4, 8, 16", "3, 5, 9, 17", "1, 2, 4, 7"]
    },
    {
      text: "Który z podanych ciągów jest geometryczny?",
      correct: "2, 6, 18, 54",
      wrong: ["3, 6, 10, 15", "4, 7, 10, 13", "2, 5, 9, 14"]
    },
    {
      text: "Jeżeli a4=11 i a6=19 w ciągu arytmetycznym, to a5 jest równe",
      correct: "15",
      wrong: ["14", "16", "19"]
    },
    {
      text: "Jeżeli a1=81 i q=1/3, to a3 w ciągu geometrycznym wynosi",
      correct: "09",
      wrong: ["27", "03", "81"]
    },
    {
      text: "Jeżeli a2=6 i q=3, to pierwszy wyraz tego ciągu geometrycznego to",
      correct: "02",
      wrong: ["03", "09", "18"]
    },
    {
      text: "Jeżeli a1=7 i r=-2, to szósty wyraz tego ciągu arytmetycznego wynosi",
      correct: "-3",
      wrong: ["-1", "03", "05"]
    },
    {
      text: "W ciągu arytmetycznym wyraz środkowy jest średnią arytmetyczną wyrazów sąsiednich. To zdanie jest",
      correct: "prawdziwe",
      wrong: ["fałszywe", "zależy od n", "prawdziwe tylko dla q>1"]
    },
    {
      text: "W ciągu geometrycznym każdy wyraz od drugiego powstaje przez mnożenie poprzedniego przez",
      correct: "stały iloraz",
      wrong: ["stałą różnicę", "numer wyrazu", "sumę dwóch poprzednich"]
    },
    {
      text: "Jeżeli q jest ujemne, to kolejne wyrazy ciągu geometrycznego zazwyczaj mają",
      correct: "naprzemienne znaki",
      wrong: ["zawsze ten sam znak", "wyłącznie dodatnie wartości", "różnicę równą zero"]
    },
    {
      text: "Jeżeli r=0 w ciągu arytmetycznym, to wszystkie wyrazy są",
      correct: "jednakowe",
      wrong: ["rosnące", "malejące", "naprzemiennie dodatnie i ujemne"]
    },
    {
      text: "Suma pięciu początkowych wyrazów ciągu 2, 5, 8, 11, 14 jest równa",
      correct: "40",
      wrong: ["35", "45", "14"]
    },
    {
      text: "Jeżeli a3=10 i a7=22 w ciągu arytmetycznym, to różnica r jest równa",
      correct: "03",
      wrong: ["02", "04", "12"]
    },
    {
      text: "Jeżeli a1=3 i q=2, to a4 w ciągu geometrycznym jest równe",
      correct: "24",
      wrong: ["12", "16", "48"]
    },
    {
      text: "W ciągu arytmetycznym o a1=5 i r=3 czwarty wyraz jest równy",
      correct: "14",
      wrong: ["11", "17", "20"]
    },
    {
      text: "W ciągu arytmetycznym a1=2, a5=18. Różnica r wynosi",
      correct: "04",
      wrong: ["03", "05", "16"]
    },
    {
      text: "Suma czterech początkowych wyrazów ciągu geometrycznego 1, 2, 4, 8 jest równa",
      correct: "15",
      wrong: ["14", "16", "08"]
    }
  ] as const;

  for (let i = 0; i < theoryQuestions.length; i += 1) {
    const item = theoryQuestions[i];
    pushScienceQuestion(result, item.text, item.correct, [...item.wrong], i + 380);
  }

  return result;
}

function pushScienceQuestion(
  target: ScienceQuestionPackItem[],
  text: string,
  correct: string,
  wrong: [string, string, string] | string[],
  seed: number
): void {
  const distractors = [wrong[0], wrong[1], wrong[2]] as [string, string, string];
  target.push(asScience(text, ...rotateOptions(correct, distractors, seed), "matma"));
}

function formatSignedTerm(coefficient: number, degree: number): string {
  if (coefficient === 0) {
    return "";
  }

  const sign = coefficient > 0 ? "+" : "-";
  const abs = Math.abs(coefficient);
  const coeffLabel = abs === 1 ? "" : String(abs);
  if (degree === 1) {
    return `${sign}${coeffLabel}x`;
  }

  return `${sign}${coeffLabel}x^${degree}`;
}

function formatLinearTerm(coefficient: number): string {
  if (coefficient === 0) {
    return "";
  }

  const sign = coefficient > 0 ? "+" : "-";
  const abs = Math.abs(coefficient);
  const coeffLabel = abs === 1 ? "" : String(abs);
  return `${sign}${coeffLabel}x`;
}

function formatConstant(value: number): string {
  if (value === 0) {
    return "";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function factorTerm(root: number): string {
  return root >= 0 ? `(x-${root})` : `(x+${Math.abs(root)})`;
}

function divisorLabel(value: number): string {
  return value >= 0 ? `x-${value}` : `x+${Math.abs(value)}`;
}

function formatNumericValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(value).replace(".", ",");
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
