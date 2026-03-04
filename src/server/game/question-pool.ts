import type {
  CouplePromptCard,
  QuestionCard,
  QuizCategory,
  ScienceQuestionPrompt
} from "../../lib/types";
import { AppDatabase } from "../db";
import { loadQuestionPack, QUESTION_PACK_VERSION } from "./content/load-question-pack";

const CONTENT_META_KEY = "question_pack_version";

export function seedBuiltinQuestions(db: AppDatabase): void {
  const currentVersion = db.getContentSeedMeta(CONTENT_META_KEY);
  if (currentVersion === QUESTION_PACK_VERSION) {
    return;
  }

  const pack = loadQuestionPack();

  db.transaction(() => {
    db.clearBuiltinQuestionContent();

    db.seedBuiltinQuestions("qa-lightning", pack.qaLightning);
    db.seedBuiltinQuestions("better-half", pack.betterHalf);

    db.seedScienceQuestions("matma", pack.scienceQuiz.matma);
    db.seedScienceQuestions("geografia", pack.scienceQuiz.geografia);
    db.seedScienceQuestions("nauka", pack.scienceQuiz.nauka);
    db.seedScienceQuestions("wiedza-ogolna", pack.scienceQuiz["wiedza-ogolna"]);

    db.seedPriorityPrompts(pack.couplePriorities);

    db.setContentSeedMeta(CONTENT_META_KEY, QUESTION_PACK_VERSION);
  });
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
