"use client";

import { useState } from "react";

import { getGameCatalogItem } from "../lib/game-catalog";
import { winnerBadge } from "../lib/score-visuals";
import type { GameHistoryEntry } from "../lib/types";
import { AppIcon } from "./app-icon";
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
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const canToggle = history.length > 6;

  return (
    <section className="section-block" data-testid="history-list">
      <div className="section-header">
        <h2>Historia gier</h2>
        <span className="chip chip--soft">{history.length} zapisów</span>
      </div>

      <div className={`history-list-wrap ${expanded ? "is-expanded" : "is-collapsed"}`}>
        <div className="history-list">
          {history.map((entry, index) => {
            const catalog = getGameCatalogItem(entry.gameId);
            const badge =
              entry.status === "aborted"
                ? { tone: "warning" as const, icon: "•", label: "Przerwana" }
                : winnerBadge(entry.scores, entry.winnerRole);

            return (
              <article
                className="history-row"
                key={entry.sessionId}
                data-testid={`history-row-${entry.sessionId}`}
                style={{ ["--row-delay" as string]: `${index * 25}ms` }}
              >
                <div className="history-row__head history-row__head--compact">
                  <div className="history-row__title-wrap">
                    <h3>
                      <AppIcon src={catalog.iconPath} className="inline-icon" />
                      {gameLabel(entry.gameId)}
                    </h3>
                    <p className="history-row__score">{`${entry.scores.Sami}:${entry.scores.Patryk}`}</p>
                  </div>
                  <div className="history-row__badge">
                    <ResultChip tone={badge.tone} icon={badge.icon} label={badge.label} />
                  </div>
                </div>

                <div className="history-row__meta history-row__meta--compact">
                  <small className="muted">{formatDate(entry.startedAt)}</small>
                  <small className="muted">{`#${entry.sessionId}`}</small>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {canToggle ? (
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
