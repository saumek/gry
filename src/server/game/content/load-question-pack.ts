import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { QuestionPack, validateQuestionPack } from "./question-pack.schema";

export const QUESTION_PACK_VERSION = "v1.10.1-question-pack-pl";
const QUESTION_PACK_FILE = "question-pack.v1_10.pl.json";

let cachedPack: QuestionPack | null = null;

export function loadQuestionPack(): QuestionPack {
  if (cachedPack) {
    return cachedPack;
  }

  const filePath = resolvePackPath();
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const validated = validateQuestionPack(parsed);

  if (validated.version !== QUESTION_PACK_VERSION) {
    throw new Error(
      `Nieprawidłowa wersja question pack. Oczekiwano ${QUESTION_PACK_VERSION}, otrzymano ${validated.version}.`
    );
  }

  cachedPack = validated;
  return validated;
}

export function resolvePackPath(): string {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  return path.join(directory, QUESTION_PACK_FILE);
}
