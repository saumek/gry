"use client";

import {
  createScienceResultHero,
  createScienceRoundVisual,
  createScienceTimeline
} from "../lib/game-visuals/science-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type { GameActionPayload, ScienceQuizGameState } from "../lib/types";
import { PointBreakdown } from "./point-breakdown";
import { ResultChip } from "./result-chip";
import { ResultHero } from "./result-hero";
import { RoundTimeline } from "./round-timeline";
import { Scoreboard } from "./scoreboard";

type ScienceQuizGameProps = {
  state: ScienceQuizGameState;
  meRole: "Sami" | "Patryk";
  onAction: (payload: GameActionPayload) => void;
};

export function ScienceQuizGame({ state, meRole, onAction }: ScienceQuizGameProps) {
  const submitted = state.submittedRoles.includes(meRole);
  const roundVisual = state.reveal ? createScienceRoundVisual(state.reveal) : null;
  const resultHero = createScienceResultHero(state);
  const timeline = createScienceTimeline(state.history);

  return (
    <section className="stack-lg" data-testid="science-quiz-game">
      <Scoreboard
        scores={state.scores}
        meRole={meRole}
        subtitle={`${categoryLabel(state.category)} · Runda ${state.round}/${state.totalRounds}`}
      />

      <section className="section-block">
        <div className="section-header">
          <h2>Quiz naukowy</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "in_round" && state.currentQuestion ? (
          <div className="stack motion-fade-up" key={`science-round-${state.round}`}>
            <h3>{state.currentQuestion.text}</h3>
            <div className="option-grid">
              {state.currentQuestion.options.map((option, index) => (
                <button
                  key={option}
                  className={`btn btn--ghost ${submitted ? "" : "btn--interactive"}`}
                  type="button"
                  disabled={submitted}
                  onClick={() =>
                    onAction({
                      gameId: "science-quiz",
                      type: "submit",
                      answerIndex: index
                    })
                  }
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="result-chip-row">
              {submitted ? (
                <ResultChip tone="warning" icon="•" label="Odpowiedź zapisana - czekasz na partnera" />
              ) : (
                <ResultChip tone="info" icon="•" label="Wybierz odpowiedź" />
              )}
            </div>
          </div>
        ) : null}

        {state.phase === "reveal" && state.reveal ? (
          <div className="stack motion-fade-up" key={`science-reveal-${state.reveal.round}`}>
            {roundVisual ? (
              <ResultHero
                model={{
                  title: `Runda ${state.reveal.round} · ${roundVisual.title}`,
                  subtitle: roundVisual.subtitle ?? "",
                  tone: roundVisual.tone,
                  icon: roundVisual.icon,
                  stats: [
                    { label: "Sami", value: String(state.scores.Sami) },
                    { label: "Patryk", value: String(state.scores.Patryk) }
                  ]
                }}
              />
            ) : null}

            <div className="decision-grid decision-grid--science">
              {roundVisual?.decisions.map((decision) => (
                <article
                  key={`${decision.title}-${decision.actor}`}
                  className={`decision-card decision-card--${decision.tone}`}
                >
                  <div className="decision-card__head">
                    <span className="decision-card__icon" aria-hidden="true">
                      {decision.icon}
                    </span>
                    <strong>{decision.title}</strong>
                  </div>
                  <p className="decision-card__choice">{decision.choice}</p>
                </article>
              ))}
            </div>

            {roundVisual ? <PointBreakdown title="Rozpiska punktów" items={roundVisual.points} /> : null}
            <RoundTimeline items={timeline} />

            <button
              className="btn"
              type="button"
              onClick={() => onAction({ gameId: "science-quiz", type: "advance" })}
            >
              {state.round >= state.totalRounds ? "Pokaż wynik końcowy" : "Następna runda"}
            </button>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="stack motion-fade-up" id="game-result-section" data-testid="game-result-section">
            <ResultHero model={resultHero} />
            <RoundTimeline items={timeline} />

            <div className="result-actions">
              <button
                className="btn"
                type="button"
                onClick={() => onAction({ gameId: "science-quiz", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "science-quiz", type: "return_lobby" })}
              >
                Powrót do lobby
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function categoryLabel(category: ScienceQuizGameState["category"]): string {
  if (category === "matma") return "Matma";
  if (category === "geografia") return "Geografia";
  if (category === "nauka") return "Nauka";
  return "Wiedza ogólna";
}
