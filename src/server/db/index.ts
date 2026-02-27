import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import type {
  GameHistoryEntry,
  GameId,
  GameScore,
  QuestionCard,
  QuestionSource,
  Role
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

      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL CHECK(game_id IN ('qa-lightning','better-half','mini-battleship')),
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

      CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_rounds_session_id ON game_rounds(session_id);
      CREATE INDEX IF NOT EXISTS idx_game_scores_session_id ON game_scores(session_id);
      CREATE INDEX IF NOT EXISTS idx_battleship_shots_session_id ON battleship_shots(session_id);
    `);
  }
}
