"use client";

import { useState } from "react";

import { getGameCatalogItem } from "../lib/game-catalog";
import { winnerBadge } from "../lib/score-visuals";
import type { GameHistoryEntry } from "../lib/types";
import { ResultChip } from "./result-chip";

type GameHistoryCardsProps = {
  history: GameHistoryEntry[];
};

function gameLabel(id: GameHistoryEntry["gameId"]): string {
  return getGameCatalogItem(id).title;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function GameHistoryCards({ history }: GameHistoryCardsProps) {
  if (history.length === 0) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const visibleHistory = expanded ? history : history.slice(0, 6);

  return (
    <section className="section-block" data-testid="history-list">
      <div className="section-header">
        <h2>Historia gier</h2>
        <span className="chip chip--soft">{history.length} zapisów</span>
      </div>

      <div className="history-list">
        {visibleHistory.map((entry) => {
          const catalog = getGameCatalogItem(entry.gameId);
          const badge =
            entry.status === "aborted"
              ? { tone: "warning" as const, icon: "•", label: "Przerwana" }
              : winnerBadge(entry.scores, entry.winnerRole);

          return (
            <article className="history-row" key={entry.sessionId} data-testid={`history-row-${entry.sessionId}`}>
              <div className="history-row__head history-row__head--compact">
                <h3>
                  <img src={catalog.iconPath} alt="" aria-hidden="true" className="inline-icon" />
                  {gameLabel(entry.gameId)}
                </h3>
                <p className="history-row__score">{`${entry.scores.Sami}:${entry.scores.Patryk}`}</p>
              </div>

              <div className="history-row__meta">
                <ResultChip tone={badge.tone} icon={badge.icon} label={badge.label} />
                <small className="muted">{`${formatDate(entry.startedAt)} · #${entry.sessionId}`}</small>
              </div>
            </article>
          );
        })}
      </div>

      {history.length > 6 ? (
        <div className="row-actions">
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            data-testid="history-toggle"
          >
            {expanded ? "Pokaż mniej" : "Pokaż więcej"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
