import { createScoreCards, getLeadProgress, getLeader } from "../lib/score-visuals";
import { displayRoleName } from "../lib/ui-state";
import type { GameScore, Role } from "../lib/types";

type ScoreboardProps = {
  scores: GameScore;
  subtitle?: string;
  meRole?: Role;
};

export function Scoreboard({ scores, subtitle, meRole }: ScoreboardProps) {
  const cards = createScoreCards(scores);
  const leader = getLeader(scores);
  const progress = getLeadProgress(scores);
  const leadLabel = leader ? `Prowadzi ${displayRoleName(leader)}` : "Remis";

  return (
    <section className="scoreboard" aria-label="Wynik gry" data-testid="scoreboard">
      <div className="section-header">
        <h3>Wynik na żywo</h3>
        <span className="scoreboard-status">{leadLabel}</span>
      </div>

      {subtitle ? <p className="scoreboard-subtitle">{subtitle}</p> : null}

      <div className="score-inline">
        {cards.map((card) => (
          <article
            key={`${card.role}-${card.points}`}
            className={`score-inline__item ${card.lead ? "is-leading" : ""}`}
            data-testid={`score-${card.role}`}
          >
            <header className="score-inline__head">
              <strong>{displayRoleName(card.role)}</strong>
              <small>{meRole === card.role ? "Ty" : "Partner"}</small>
            </header>
            <p className="score-inline__value score-inline__value--animated">{card.points}</p>
            <small>{card.delta === 0 ? "Równo" : `Przewaga: ${card.delta}`}</small>
          </article>
        ))}
      </div>

      <div className="score-progress" aria-hidden="true">
        <span className="score-progress__bar" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
