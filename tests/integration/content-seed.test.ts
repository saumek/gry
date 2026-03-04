import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { AppDatabase } from "../../src/server/db";
import { QUESTION_PACK_VERSION } from "../../src/server/game/content/load-question-pack";
import { seedBuiltinQuestions as seedPackQuestions } from "../../src/server/game/question-pool";

const META_KEY = "question_pack_version";

describe("content seed v1.10", () => {
  it("wymienia builtin po zmianie wersji i zachowuje custom", () => {
    const dbPath = path.join(os.tmpdir(), `duoplay-seed-${Date.now()}-${Math.random()}.db`);

    const bootstrap = new AppDatabase(dbPath);
    bootstrap.close();

    const raw = new Database(dbPath);
    const now = new Date().toISOString();

    raw.prepare(
      `INSERT INTO questions(game_id, text, option_a, option_b, option_c, option_d, source, author_role, created_at)
       VALUES ('qa-lightning', 'Custom QA pytanie testowe', 'Opcja A', 'Opcja B', 'Opcja C', 'Opcja D', 'custom', 'Sami', ?)`
    ).run(now);

    raw.prepare(
      `INSERT INTO science_questions(category, text, option_a, option_b, option_c, option_d, correct_index, source, created_at)
       VALUES ('matma', 'Custom Science pytanie testowe', 'A1', 'B2', 'C3', 'D4', 0, 'custom', ?)`
    ).run(now);

    raw.prepare(
      `INSERT INTO priority_prompts(text, option_a, option_b, option_c, option_d, source, created_at)
       VALUES ('Custom Priorytet testowy', 'Wariant A', 'Wariant B', 'Wariant C', 'Wariant D', 'custom', ?)`
    ).run(now);

    raw.prepare(
      `INSERT INTO content_seed_meta(key, value, updated_at)
       VALUES (?, 'legacy-pack', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(META_KEY, now);

    raw.close();

    const db = new AppDatabase(dbPath);
    seedPackQuestions(db);

    const verify = new Database(dbPath, { readonly: true });
    const questionsBuiltin = (verify
      .prepare(`SELECT COUNT(*) as count FROM questions WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    const questionsCustom = (verify
      .prepare(`SELECT COUNT(*) as count FROM questions WHERE source = 'custom'`)
      .get() as { count: number }).count;
    const scienceBuiltin = (verify
      .prepare(`SELECT COUNT(*) as count FROM science_questions WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    const scienceCustom = (verify
      .prepare(`SELECT COUNT(*) as count FROM science_questions WHERE source = 'custom'`)
      .get() as { count: number }).count;
    const prioritiesBuiltin = (verify
      .prepare(`SELECT COUNT(*) as count FROM priority_prompts WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    const prioritiesCustom = (verify
      .prepare(`SELECT COUNT(*) as count FROM priority_prompts WHERE source = 'custom'`)
      .get() as { count: number }).count;
    const seedVersion = (verify
      .prepare(`SELECT value FROM content_seed_meta WHERE key = ?`)
      .get(META_KEY) as { value: string }).value;
    verify.close();

    expect(questionsBuiltin).toBe(600);
    expect(questionsCustom).toBe(1);
    expect(scienceBuiltin).toBe(800);
    expect(scienceCustom).toBe(1);
    expect(prioritiesBuiltin).toBe(220);
    expect(prioritiesCustom).toBe(1);
    expect(seedVersion).toBe(QUESTION_PACK_VERSION);

    seedPackQuestions(db);
    db.close();

    const verifyAfter = new Database(dbPath, { readonly: true });
    const questionsBuiltinAfter = (verifyAfter
      .prepare(`SELECT COUNT(*) as count FROM questions WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    const scienceBuiltinAfter = (verifyAfter
      .prepare(`SELECT COUNT(*) as count FROM science_questions WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    const prioritiesBuiltinAfter = (verifyAfter
      .prepare(`SELECT COUNT(*) as count FROM priority_prompts WHERE source = 'builtin'`)
      .get() as { count: number }).count;
    verifyAfter.close();

    expect(questionsBuiltinAfter).toBe(600);
    expect(scienceBuiltinAfter).toBe(800);
    expect(prioritiesBuiltinAfter).toBe(220);
  });
});
