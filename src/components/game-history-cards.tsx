import { winnerBadge } from "../lib/score-visuals";
import type { GameHistoryEntry } from "../lib/types";
import { ResultChip } from "./result-chip";

type GameHistoryCardsProps = {
  history: GameHistoryEntry[];
};

function gameLabel(id: GameHistoryEntry["gameId"]): string {
  if (id === "qa-lightning") {
    return "Pytania i odpowiedzi";
  }

  if (id === "better-half") {
    return "Jak odpowie druga połówka";
  }

  return "Mini Statki 5x5";
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

  return (
    <section className="section-block" data-testid="history-list">
      <div className="section-header">
        <h2>Historia gier</h2>
        <span className="chip chip--soft">{history.length} zapisów</span>
      </div>

      <div className="history-list">
        {history.slice(0, 8).map((entry) => {
          const badge =
            entry.status === "aborted"
              ? { tone: "warning" as const, icon: "•", label: "Przerwana" }
              : winnerBadge(entry.scores, entry.winnerRole);

          return (
            <article className="history-row" key={entry.sessionId} data-testid={`history-row-${entry.sessionId}`}>
              <div className="history-row__head">
                <h3>{gameLabel(entry.gameId)}</h3>
                <small>#{entry.sessionId}</small>
              </div>
              <p className="history-row__score">{`Sami ${entry.scores.Sami} : ${entry.scores.Patryk} Patryk`}</p>
              <div className="history-row__meta">
                <ResultChip tone={badge.tone} icon={badge.icon} label={badge.label} />
                <small className="muted">{formatDate(entry.startedAt)}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
