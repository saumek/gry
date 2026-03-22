import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  QuestionPack,
  RelationQuestionPackItem,
  ScienceQuestionPackItem,
  validateQuestionPack
} from "./question-pack.schema";

export const QUESTION_PACK_VERSION = "v2.0.0-curated-content-pl";

const SECTION_FILES = {
  qaLightning: "qa-lightning.json",
  betterHalf: "better-half.json",
  couplePriorities: "couple-priorities.json",
  scienceQuiz: {
    matma: "science-matma.json",
    geografia: "science-geografia.json",
    nauka: "science-nauka.json",
    "wiedza-ogolna": "science-wiedza-ogolna.json"
  }
} as const;

const ALL_SECTION_FILES = [
  SECTION_FILES.qaLightning,
  SECTION_FILES.betterHalf,
  SECTION_FILES.couplePriorities,
  SECTION_FILES.scienceQuiz.matma,
  SECTION_FILES.scienceQuiz.geografia,
  SECTION_FILES.scienceQuiz.nauka,
  SECTION_FILES.scienceQuiz["wiedza-ogolna"]
] as const;

let cachedPack: QuestionPack | null = null;

export function loadQuestionPack(): QuestionPack {
  if (cachedPack) {
    return cachedPack;
  }

  const parsed: QuestionPack = {
    version: QUESTION_PACK_VERSION,
    generatedAt: resolveGeneratedAt(),
    qaLightning: readSection<RelationQuestionPackItem>(SECTION_FILES.qaLightning),
    betterHalf: readSection<RelationQuestionPackItem>(SECTION_FILES.betterHalf),
    scienceQuiz: {
      matma: readSection<ScienceQuestionPackItem>(SECTION_FILES.scienceQuiz.matma),
      geografia: readSection<ScienceQuestionPackItem>(SECTION_FILES.scienceQuiz.geografia),
      nauka: readSection<ScienceQuestionPackItem>(SECTION_FILES.scienceQuiz.nauka),
      "wiedza-ogolna": readSection<ScienceQuestionPackItem>(SECTION_FILES.scienceQuiz["wiedza-ogolna"])
    },
    couplePriorities: readSection<RelationQuestionPackItem>(SECTION_FILES.couplePriorities)
  };
  const validated = validateQuestionPack(parsed);

  if (validated.version !== QUESTION_PACK_VERSION) {
    throw new Error(
      `Nieprawidłowa wersja question pack. Oczekiwano ${QUESTION_PACK_VERSION}, otrzymano ${validated.version}.`
    );
  }

  cachedPack = validated;
  return validated;
}

function readSection<T>(filename: string): T[] {
  const raw = fs.readFileSync(resolveSectionPath(filename), "utf-8");
  return JSON.parse(raw) as T[];
}

function resolveGeneratedAt(): string {
  const latestModifiedAt = Math.max(
    ...ALL_SECTION_FILES.map((filename) => fs.statSync(resolveSectionPath(filename)).mtimeMs)
  );

  return new Date(latestModifiedAt).toISOString();
}

export function resolveSectionPath(filename: string): string {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  return path.join(directory, "sections", filename);
}
