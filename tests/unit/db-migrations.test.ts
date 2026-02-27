import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { AppDatabase } from "../../src/server/db";

describe("db migrations", () => {
  it("usuwa historyczne sesje fire-water-coop i dane zależne", () => {
    const dbPath = path.join(os.tmpdir(), `duoplay-db-cleanup-${Date.now()}-${Math.random()}.db`);

    const bootstrap = new AppDatabase(dbPath);
    bootstrap.close();

    const raw = new Database(dbPath);
    const now = new Date().toISOString();
    const sessionInsert = raw.prepare(
      `INSERT INTO game_sessions(game_id, status, started_at, finished_at, winner_role, state_json)
       VALUES ('fire-water-coop', 'finished', ?, ?, NULL, '{}')`
    );
    const sessionId = Number(sessionInsert.run(now, now).lastInsertRowid);

    raw.prepare(`INSERT INTO game_rounds(session_id, round_no, payload_json, created_at) VALUES (?, 1, '{}', ?)`)
      .run(sessionId, now);
    raw.prepare(`INSERT INTO game_scores(session_id, role, score) VALUES (?, 'Sami', 1)`).run(sessionId);
    raw.prepare(`INSERT INTO game_scores(session_id, role, score) VALUES (?, 'Patryk', 1)`).run(sessionId);
    raw.prepare(
      `INSERT INTO battleship_shots(session_id, turn_no, shooter_role, x, y, result, created_at)
       VALUES (?, 1, 'Sami', 0, 0, 'hit', ?)`
    ).run(sessionId, now);
    raw.close();

    const reopened = new AppDatabase(dbPath);
    reopened.close();

    const verify = new Database(dbPath, { readonly: true });
    const countSession = (verify.prepare(
      `SELECT COUNT(*) as count FROM game_sessions WHERE game_id = 'fire-water-coop'`
    ).get() as { count: number }).count;
    const countRounds = (verify.prepare(
      `SELECT COUNT(*) as count FROM game_rounds WHERE session_id = ?`
    ).get(sessionId) as { count: number }).count;
    const countScores = (verify.prepare(
      `SELECT COUNT(*) as count FROM game_scores WHERE session_id = ?`
    ).get(sessionId) as { count: number }).count;
    const countShots = (verify.prepare(
      `SELECT COUNT(*) as count FROM battleship_shots WHERE session_id = ?`
    ).get(sessionId) as { count: number }).count;
    verify.close();

    expect(countSession).toBe(0);
    expect(countRounds).toBe(0);
    expect(countScores).toBe(0);
    expect(countShots).toBe(0);
  });
});
