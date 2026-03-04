import { z } from "zod";

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
  /\bwulg/i,
  /\bpolityk/i,
  /\bparti(a|e)\b/i
];

const optionTupleSchema = z
  .tuple([
    z.string().trim().min(OPTION_TEXT_MIN).max(OPTION_TEXT_MAX),
    z.string().trim().min(OPTION_TEXT_MIN).max(OPTION_TEXT_MAX),
    z.string().trim().min(OPTION_TEXT_MIN).max(OPTION_TEXT_MAX),
    z.string().trim().min(OPTION_TEXT_MIN).max(OPTION_TEXT_MAX)
  ])
  .refine((options) => new Set(options.map((entry) => normalizeText(entry))).size === 4, {
    message: "Opcje odpowiedzi muszą być unikalne"
  });

const relationQuestionSchema = z.object({
  text: z.string().trim().min(QUESTION_TEXT_MIN).max(QUESTION_TEXT_MAX),
  options: optionTupleSchema
});

const scienceQuestionSchema = relationQuestionSchema.extend({
  correctIndex: z.number().int().min(0).max(3)
});

export const questionPackSchema = z.object({
  version: z.string().trim().min(1),
  generatedAt: z.string().trim().min(1),
  qaLightning: z.array(relationQuestionSchema).length(300),
  betterHalf: z.array(relationQuestionSchema).length(300),
  scienceQuiz: z.object({
    matma: z.array(scienceQuestionSchema).length(200),
    geografia: z.array(scienceQuestionSchema).length(200),
    nauka: z.array(scienceQuestionSchema).length(200),
    "wiedza-ogolna": z.array(scienceQuestionSchema).length(200)
  }),
  couplePriorities: z.array(relationQuestionSchema).length(220)
});

export type RelationQuestionPackItem = z.infer<typeof relationQuestionSchema>;
export type ScienceQuestionPackItem = z.infer<typeof scienceQuestionSchema>;
export type QuestionPack = z.infer<typeof questionPackSchema>;

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

function assertQuality(
  items: Array<{ text: string; options: [string, string, string, string] }>,
  scope: string
): void {
  const seenNormalized = new Set<string>();

  for (const [index, item] of items.entries()) {
    const normalized = normalizeText(item.text);
    if (seenNormalized.has(normalized)) {
      throw new Error(`Duplikat dokładny pytania w ${scope} na pozycji ${index + 1}`);
    }
    seenNormalized.add(normalized);

    if (bannedPatterns.some((pattern) => pattern.test(item.text))) {
      throw new Error(`Treść niedozwolona w ${scope} na pozycji ${index + 1}`);
    }
  }

  for (let i = 0; i < items.length; i += 1) {
    const baseTokens = textTokenSet(items[i].text);
    for (let j = i + 1; j < items.length; j += 1) {
      const similarity = jaccardSimilarity(baseTokens, textTokenSet(items[j].text));
      if (similarity > SIMILARITY_THRESHOLD) {
        throw new Error(
          `Near-duplicate w ${scope} między pozycjami ${i + 1} i ${j + 1} (similarity=${similarity.toFixed(
            3
          )})`
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

function textTokenSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
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
