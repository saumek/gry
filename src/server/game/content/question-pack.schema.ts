const QUESTION_TEXT_MIN = 12;
const QUESTION_TEXT_MAX = 180;
const OPTION_TEXT_MIN = 2;
const OPTION_TEXT_MAX = 80;
const SIMILARITY_THRESHOLD = 0.9;

const bannedPatterns = [
  /\bseks\b/i,
  /\bseksual/i,
  /\bporno/i,
  /\berotycz/i,
  /\bwulg/i
];

export type RelationQuestionPackItem = {
  text: string;
  options: [string, string, string, string];
};

export type ScienceQuestionPackItem = RelationQuestionPackItem & {
  correctIndex: number;
};

export type QuestionPack = {
  version: string;
  generatedAt: string;
  qaLightning: RelationQuestionPackItem[];
  betterHalf: RelationQuestionPackItem[];
  scienceQuiz: {
    matma: ScienceQuestionPackItem[];
    geografia: ScienceQuestionPackItem[];
    nauka: ScienceQuestionPackItem[];
    "wiedza-ogolna": ScienceQuestionPackItem[];
  };
  couplePriorities: RelationQuestionPackItem[];
};

type QuestionPackSchema = {
  parse(input: unknown): QuestionPack;
};

export const questionPackSchema: QuestionPackSchema = {
  parse: parseQuestionPack
};

export function validateQuestionPack(input: unknown): QuestionPack {
  const parsed = questionPackSchema.parse(input);

  assertQuality(parsed.qaLightning, "qaLightning");
  assertQuality(parsed.betterHalf, "betterHalf");
  assertQuality(parsed.scienceQuiz.matma, "scienceQuiz.matma");
  assertQuality(parsed.scienceQuiz.geografia, "scienceQuiz.geografia");
  assertQuality(parsed.scienceQuiz.nauka, "scienceQuiz.nauka");
  assertQuality(parsed.scienceQuiz["wiedza-ogolna"], "scienceQuiz.wiedza-ogolna");
  assertQuality(parsed.couplePriorities, "couplePriorities");

  return parsed;
}

function parseQuestionPack(input: unknown): QuestionPack {
  const root = expectRecord(input, "question pack");

  return {
    version: readText(root.version, "questionPack.version", 1),
    generatedAt: readText(root.generatedAt, "questionPack.generatedAt", 1),
    qaLightning: parseRelationQuestionList(root.qaLightning, "qaLightning", 300),
    betterHalf: parseRelationQuestionList(root.betterHalf, "betterHalf", 300),
    scienceQuiz: {
      matma: parseScienceQuestionList(root.scienceQuiz, "scienceQuiz.matma", "matma", 200),
      geografia: parseScienceQuestionList(root.scienceQuiz, "scienceQuiz.geografia", "geografia", 200),
      nauka: parseScienceQuestionList(root.scienceQuiz, "scienceQuiz.nauka", "nauka", 200),
      "wiedza-ogolna": parseScienceQuestionList(
        root.scienceQuiz,
        "scienceQuiz.wiedza-ogolna",
        "wiedza-ogolna",
        200
      )
    },
    couplePriorities: parseRelationQuestionList(root.couplePriorities, "couplePriorities", 220)
  };
}

function parseRelationQuestionList(
  value: unknown,
  scope: string,
  expectedLength: number
): RelationQuestionPackItem[] {
  const items = expectArray(value, scope);
  if (items.length !== expectedLength) {
    throw new Error(`Nieprawidłowa liczba rekordów w ${scope}. Oczekiwano ${expectedLength}.`);
  }

  return items.map((item, index) => parseRelationQuestion(item, `${scope}[${index + 1}]`));
}

function parseScienceQuestionList(
  scienceQuiz: unknown,
  scope: string,
  category: keyof QuestionPack["scienceQuiz"],
  expectedLength: number
): ScienceQuestionPackItem[] {
  const root = expectRecord(scienceQuiz, "scienceQuiz");
  const items = expectArray(root[category], scope);
  if (items.length !== expectedLength) {
    throw new Error(`Nieprawidłowa liczba rekordów w ${scope}. Oczekiwano ${expectedLength}.`);
  }

  return items.map((item, index) => parseScienceQuestion(item, `${scope}[${index + 1}]`));
}

function parseRelationQuestion(value: unknown, path: string): RelationQuestionPackItem {
  const raw = expectRecord(value, path);

  return {
    text: readQuestionText(raw.text, `${path}.text`),
    options: readOptions(raw.options, `${path}.options`, OPTION_TEXT_MIN)
  };
}

function parseScienceQuestion(
  value: unknown,
  path: string
): ScienceQuestionPackItem {
  const raw = expectRecord(value, path);

  return {
    text: readQuestionText(raw.text, `${path}.text`),
    options: readOptions(raw.options, `${path}.options`, 1),
    correctIndex: readCorrectIndex(raw.correctIndex, `${path}.correctIndex`)
  };
}

function readQuestionText(value: unknown, path: string): string {
  const text = readText(value, path, QUESTION_TEXT_MIN);
  if (text.length > QUESTION_TEXT_MAX) {
    throw new Error(`${path} przekracza maksymalną długość ${QUESTION_TEXT_MAX}.`);
  }
  return text;
}

function readText(value: unknown, path: string, minLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${path} musi być tekstem.`);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new Error(`${path} jest zbyt krótki.`);
  }

  return trimmed;
}

function readOptions(
  value: unknown,
  path: string,
  minOptionLength: number
): [string, string, string, string] {
  const options = expectArray(value, path);
  if (options.length !== 4) {
    throw new Error(`${path} musi zawierać dokładnie 4 opcje.`);
  }

  const parsed = [
    readOptionText(options[0], `${path}[1]`, minOptionLength),
    readOptionText(options[1], `${path}[2]`, minOptionLength),
    readOptionText(options[2], `${path}[3]`, minOptionLength),
    readOptionText(options[3], `${path}[4]`, minOptionLength)
  ] as [string, string, string, string];

  if (new Set(parsed.map((entry) => normalizeOptionText(entry))).size !== 4) {
    throw new Error("Opcje odpowiedzi muszą być unikalne");
  }

  return parsed;
}

function readOptionText(value: unknown, path: string, minLength: number): string {
  const text = readText(value, path, minLength);
  if (text.length > OPTION_TEXT_MAX) {
    throw new Error(`${path} przekracza maksymalną długość ${OPTION_TEXT_MAX}.`);
  }
  return text;
}

function readCorrectIndex(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 3) {
    throw new Error(`${path} musi być liczbą całkowitą 0-3.`);
  }

  return value;
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} musi być tablicą.`);
  }

  return value;
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${path} musi być obiektem.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertQuality(items: Array<{ text: string; options: [string, string, string, string] }>, scope: string): void {
  const seenNormalized = new Set<string>();
  const tokenSets = new Array<Set<string>>(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const normalized = normalizeText(items[index].text);

    if (seenNormalized.has(normalized)) {
      throw new Error(`Duplikat dokładny pytania w ${scope} na pozycji ${index + 1}`);
    }

    seenNormalized.add(normalized);

    if (bannedPatterns.some((pattern) => pattern.test(items[index].text))) {
      throw new Error(`Treść niedozwolona w ${scope} na pozycji ${index + 1}`);
    }

    tokenSets[index] = textTokenSet(normalized);
  }

  for (let i = 0; i < items.length; i += 1) {
    const baseTokens = tokenSets[i];
    for (let j = i + 1; j < items.length; j += 1) {
      const similarity = jaccardSimilarity(baseTokens, tokenSets[j]);
      if (similarity > SIMILARITY_THRESHOLD) {
        throw new Error(
          `Near-duplicate w ${scope} między pozycjami ${i + 1} i ${j + 1} (similarity=${similarity.toFixed(3)})`
        );
      }
    }
  }
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textTokenSet(normalizedText: string): Set<string> {
  return new Set(
    normalizedText
      .split(" ")
      .filter((token) => token.length > 2 || /^\d+$/.test(token))
  );
}

export function jaccardSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
