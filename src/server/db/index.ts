import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import type {
  CouplePromptCard,
  GameHistoryEntry,
  GameId,
  GameScore,
  QuestionCard,
  QuestionSource,
  QuizCategory,
  Role,
  ScienceQuestionPrompt
} from "../../lib/types";

type QuestionRow = {
  id: number;
  game_id: Extract<GameId, "qa-lightning" | "better-half">;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source: QuestionSource;
  author_role: Role | null;
};

type ScienceQuestionRow = {
  id: number;
  category: QuizCategory;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
  source: QuestionSource;
};

type PriorityPromptRow = {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source: QuestionSource;
};

type SessionRow = {
  id: number;
  game_id: GameId;
  status: string;
  winner_role: Role | null;
  started_at: string;
  finished_at: string | null;
};

type ScoreRow = {
  role: Role;
  score: number;
};

export class AppDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    const resolved = path.resolve(dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma("journal_mode = WAL");
    this.runMigrations();
    this.db.pragma("optimize");
  }

  seedBuiltinQuestions(
    gameId: Extract<GameId, "qa-lightning" | "better-half">,
    cards: Array<{ text: string; options: [string, string, string, string] }>
  ): void {
    const existing = this.db
      .prepare("SELECT COUNT(*) as count FROM questions WHERE game_id = ? AND source = 'builtin'")
      .get(gameId) as { count: number };

    if (existing.count > 0) {
      return;
    }

    const insert = this.db.prepare(
      `INSERT INTO questions(
        game_id, text, option_a, option_b, option_c, option_d, source, author_role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'builtin', NULL, ?)`
    );

    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      for (const card of cards) {
        insert.run(gameId, card.text, card.options[0], card.options[1], card.options[2], card.options[3], now);
      }
    });

    tx();
  }

  seedScienceQuestions(
    category: QuizCategory,
    cards: Array<{
      text: string;
      options: [string, string, string, string];
      correctIndex: number;
    }>
  ): void {
    const existing = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM science_questions WHERE category = ? AND source = 'builtin'"
      )
      .get(category) as { count: number };

    if (existing.count > 0) {
      return;
    }

    const insert = this.db.prepare(
      `INSERT INTO science_questions(
        category, text, option_a, option_b, option_c, option_d, correct_index, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'builtin', ?)`
    );

    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      for (const card of cards) {
        insert.run(
          category,
          card.text,
          card.options[0],
          card.options[1],
          card.options[2],
          card.options[3],
          card.correctIndex,
          now
        );
      }
    });

    tx();
  }

  seedPriorityPrompts(cards: Array<{ text: string; options: [string, string, string, string] }>): void {
    const existing = this.db
      .prepare("SELECT COUNT(*) as count FROM priority_prompts WHERE source = 'builtin'")
      .get() as { count: number };

    if (existing.count > 0) {
      return;
    }

    const insert = this.db.prepare(
      `INSERT INTO priority_prompts(
        text, option_a, option_b, option_c, option_d, source, created_at
      ) VALUES (?, ?, ?, ?, ?, 'builtin', ?)`
    );

    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      for (const card of cards) {
        insert.run(card.text, card.options[0], card.options[1], card.options[2], card.options[3], now);
      }
    });

    tx();
  }

  addQuestion(
    gameId: Extract<GameId, "qa-lightning" | "better-half">,
    text: string,
    options: [string, string, string, string],
    source: QuestionSource,
    authorRole?: Role
  ): QuestionCard {
    const insert = this.db.prepare(
      `INSERT INTO questions(
        game_id, text, option_a, option_b, option_c, option_d, source, author_role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const timestamp = new Date().toISOString();
    const result = insert.run(
      gameId,
      text,
      options[0],
      options[1],
      options[2],
      options[3],
      source,
      authorRole ?? null,
      timestamp
    );

    return {
      id: Number(result.lastInsertRowid),
      gameId,
      text,
      options,
      source,
      authorRole
    };
  }

  drawQuestions(
    gameId: Extract<GameId, "qa-lightning" | "better-half">,
    count: number
  ): QuestionCard[] {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(count)));
    const rows = this.db
      .prepare(
        `SELECT id, game_id, text, option_a, option_b, option_c, option_d, source, author_role
         FROM questions
         WHERE game_id = ?
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(gameId, safeLimit) as QuestionRow[];

    return rows.map((row) => this.mapQuestion(row));
  }

  drawScienceQuestions(category: QuizCategory, count: number): Array<ScienceQuestionPrompt & { correctIndex: number }> {
    const safeLimit = Math.max(1, Math.min(120, Math.trunc(count)));
    const rows = this.db
      .prepare(
        `SELECT id, category, text, option_a, option_b, option_c, option_d, correct_index, source
         FROM science_questions
         WHERE category = ?
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(category, safeLimit) as ScienceQuestionRow[];

    return rows.map((row) => ({
      id: row.id,
      gameId: "science-quiz",
      category: row.category,
      text: row.text,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      correctIndex: row.correct_index,
      source: row.source
    }));
  }

  drawPriorityPrompts(count: number): CouplePromptCard[] {
    const safeLimit = Math.max(1, Math.min(120, Math.trunc(count)));
    const rows = this.db
      .prepare(
        `SELECT id, text, option_a, option_b, option_c, option_d, source
         FROM priority_prompts
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(safeLimit) as PriorityPromptRow[];

    return rows.map((row) => ({
      id: row.id,
      gameId: "couple-priorities",
      text: row.text,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      source: row.source
    }));
  }

  createGameSession(gameId: GameId, status: string, stateJson: string): number {
    const insert = this.db.prepare(
      `INSERT INTO game_sessions(game_id, status, started_at, state_json)
       VALUES (?, ?, ?, ?)`
    );

    const result = insert.run(gameId, status, new Date().toISOString(), stateJson);
    return Number(result.lastInsertRowid);
  }

  updateGameSessionState(
    sessionId: number,
    status: string,
    stateJson: string,
    winnerRole?: Role,
    finished = false
  ): void {
    const stmt = this.db.prepare(
      `UPDATE game_sessions
       SET status = ?, state_json = ?, winner_role = ?, finished_at = CASE WHEN ? THEN ? ELSE finished_at END
       WHERE id = ?`
    );

    stmt.run(
      status,
      stateJson,
      winnerRole ?? null,
      finished ? 1 : 0,
      finished ? new Date().toISOString() : null,
      sessionId
    );
  }

  insertGameRound(sessionId: number, roundNo: number, payload: unknown): void {
    const stmt = this.db.prepare(
      `INSERT INTO game_rounds(session_id, round_no, payload_json, created_at)
       VALUES (?, ?, ?, ?)`
    );

    stmt.run(sessionId, roundNo, JSON.stringify(payload), new Date().toISOString());
  }

  upsertGameScore(sessionId: number, role: Role, score: number): void {
    const stmt = this.db.prepare(
      `INSERT INTO game_scores(session_id, role, score)
       VALUES (?, ?, ?)
       ON CONFLICT(session_id, role)
       DO UPDATE SET score = excluded.score`
    );

    stmt.run(sessionId, role, score);
  }

  insertBattleshipShot(
    sessionId: number,
    turnNo: number,
    shooterRole: Role,
    x: number,
    y: number,
    result: "hit" | "miss" | "sunk"
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO battleship_shots(session_id, turn_no, shooter_role, x, y, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(sessionId, turnNo, shooterRole, x, y, result, new Date().toISOString());
  }

  listGameHistory(limit = 100): GameHistoryEntry[] {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const sessions = this.db
      .prepare(
        `SELECT id, game_id, status, winner_role, started_at, finished_at
         FROM game_sessions
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(safeLimit) as SessionRow[];

    const scoreStmt = this.db.prepare(
      "SELECT role, score FROM game_scores WHERE session_id = ? ORDER BY role"
    );

    return sessions.map((session) => {
      const rawScores = scoreStmt.all(session.id) as ScoreRow[];
      const scores: GameScore = {
        Sami: 0,
        Patryk: 0
      };

      for (const entry of rawScores) {
        scores[entry.role] = entry.score;
      }

      return {
        sessionId: session.id,
        gameId: session.game_id,
        status: session.status,
        winnerRole: session.winner_role ?? undefined,
        scores,
        startedAt: session.started_at,
        finishedAt: session.finished_at ?? undefined
      };
    });
  }

  close(): void {
    this.db.close();
  }

  private mapQuestion(row: QuestionRow): QuestionCard {
    return {
      id: row.id,
      gameId: row.game_id,
      text: row.text,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      source: row.source,
      authorRole: row.author_role ?? undefined
    };
  }

  private runMigrations(): void {
    this.ensureFlexibleGameSessionsTable();
    this.repairDependentSessionTables();

    this.db.exec(`
      DROP TABLE IF EXISTS chat_messages;

      CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL CHECK(game_id IN ('qa-lightning','better-half')),
        text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('builtin','custom')),
        author_role TEXT CHECK(author_role IN ('Sami','Patryk')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS science_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL CHECK(category IN ('matma','geografia','nauka','wiedza-ogolna')),
        text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_index INTEGER NOT NULL CHECK(correct_index >= 0 AND correct_index <= 3),
        source TEXT NOT NULL CHECK(source IN ('builtin','custom')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS priority_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('builtin','custom')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        winner_role TEXT CHECK(winner_role IN ('Sami','Patryk')),
        state_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        round_no INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES game_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Sami','Patryk')),
        score INTEGER NOT NULL,
        UNIQUE(session_id, role),
        FOREIGN KEY(session_id) REFERENCES game_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS battleship_shots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        turn_no INTEGER NOT NULL,
        shooter_role TEXT NOT NULL CHECK(shooter_role IN ('Sami','Patryk')),
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        result TEXT NOT NULL CHECK(result IN ('hit','miss','sunk')),
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES game_sessions(id)
      );

      DELETE FROM game_rounds
      WHERE session_id IN (SELECT id FROM game_sessions WHERE game_id = 'fire-water-coop');

      DELETE FROM game_scores
      WHERE session_id IN (SELECT id FROM game_sessions WHERE game_id = 'fire-water-coop');

      DELETE FROM battleship_shots
      WHERE session_id IN (SELECT id FROM game_sessions WHERE game_id = 'fire-water-coop');

      DELETE FROM game_sessions
      WHERE game_id = 'fire-water-coop';

      CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
      CREATE INDEX IF NOT EXISTS idx_science_questions_category ON science_questions(category);
      CREATE INDEX IF NOT EXISTS idx_priority_prompts_source ON priority_prompts(source);
      CREATE INDEX IF NOT EXISTS idx_game_rounds_session_id ON game_rounds(session_id);
      CREATE INDEX IF NOT EXISTS idx_game_scores_session_id ON game_scores(session_id);
      CREATE INDEX IF NOT EXISTS idx_battleship_shots_session_id ON battleship_shots(session_id);
    `);
  }

  private ensureFlexibleGameSessionsTable(): void {
    const row = this.db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'game_sessions'")
      .get() as { sql?: string } | undefined;

    if (!row?.sql) {
      return;
    }

    if (!/CHECK\s*\(\s*game_id\s+IN\s*\(/i.test(row.sql)) {
      return;
    }

    this.db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      DROP TABLE IF EXISTS game_sessions_old;
      ALTER TABLE game_sessions RENAME TO game_sessions_old;
      CREATE TABLE game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        winner_role TEXT CHECK(winner_role IN ('Sami','Patryk')),
        state_json TEXT NOT NULL
      );
      INSERT INTO game_sessions(id, game_id, status, started_at, finished_at, winner_role, state_json)
      SELECT id, game_id, status, started_at, finished_at, winner_role, state_json
      FROM game_sessions_old;
      DROP TABLE game_sessions_old;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  private repairDependentSessionTables(): void {
    this.rebuildTableIfReferencesOldSessions("game_rounds");
    this.rebuildTableIfReferencesOldSessions("game_scores");
    this.rebuildTableIfReferencesOldSessions("battleship_shots");
  }

  private rebuildTableIfReferencesOldSessions(tableName: "game_rounds" | "game_scores" | "battleship_shots"): void {
    if (!this.hasTable(tableName)) {
      return;
    }

    const fkRows = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as Array<{
      table: string;
    }>;

    const referencesOld = fkRows.some((row) => row.table === "game_sessions_old");
    if (!referencesOld) {
      return;
    }

    this.db.exec("PRAGMA foreign_keys = OFF;");

    if (tableName === "game_rounds") {
      this.db.exec(`
        BEGIN TRANSACTION;
        DROP TABLE IF EXISTS game_rounds_old;
        ALTER TABLE game_rounds RENAME TO game_rounds_old;
        CREATE TABLE game_rounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          round_no INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(session_id) REFERENCES game_sessions(id)
        );
        INSERT INTO game_rounds(id, session_id, round_no, payload_json, created_at)
        SELECT id, session_id, round_no, payload_json, created_at
        FROM game_rounds_old;
        DROP TABLE game_rounds_old;
        COMMIT;
      `);
    }

    if (tableName === "game_scores") {
      this.db.exec(`
        BEGIN TRANSACTION;
        DROP TABLE IF EXISTS game_scores_old;
        ALTER TABLE game_scores RENAME TO game_scores_old;
        CREATE TABLE game_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('Sami','Patryk')),
          score INTEGER NOT NULL,
          UNIQUE(session_id, role),
          FOREIGN KEY(session_id) REFERENCES game_sessions(id)
        );
        INSERT INTO game_scores(id, session_id, role, score)
        SELECT id, session_id, role, score
        FROM game_scores_old;
        DROP TABLE game_scores_old;
        COMMIT;
      `);
    }

    if (tableName === "battleship_shots") {
      this.db.exec(`
        BEGIN TRANSACTION;
        DROP TABLE IF EXISTS battleship_shots_old;
        ALTER TABLE battleship_shots RENAME TO battleship_shots_old;
        CREATE TABLE battleship_shots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          turn_no INTEGER NOT NULL,
          shooter_role TEXT NOT NULL CHECK(shooter_role IN ('Sami','Patryk')),
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          result TEXT NOT NULL CHECK(result IN ('hit','miss','sunk')),
          created_at TEXT NOT NULL,
          FOREIGN KEY(session_id) REFERENCES game_sessions(id)
        );
        INSERT INTO battleship_shots(id, session_id, turn_no, shooter_role, x, y, result, created_at)
        SELECT id, session_id, turn_no, shooter_role, x, y, result, created_at
        FROM battleship_shots_old;
        DROP TABLE battleship_shots_old;
        COMMIT;
      `);
    }

    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  private hasTable(tableName: string): boolean {
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) as { name?: string } | undefined;

    return Boolean(row?.name);
  }
}
