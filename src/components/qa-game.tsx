"use client";

import {
  createQaResultHero,
  createQaRoundVisual,
  createQaTimeline
} from "../lib/game-visuals/qa-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type { GameActionPayload, QaGameState, QuestionAddPayload } from "../lib/types";
import { PointBreakdown } from "./point-breakdown";
import { QuestionCreateForm } from "./question-create-form";
import { ResultChip } from "./result-chip";
import { ResultHero } from "./result-hero";
import { RoundTimeline } from "./round-timeline";
import { Scoreboard } from "./scoreboard";

type QaGameProps = {
  state: QaGameState;
  onAction: (payload: GameActionPayload) => void;
  onAddQuestion: (payload: QuestionAddPayload) => void;
  meRole: "Sami" | "Patryk";
};

export function QaGame({ state, onAction, onAddQuestion, meRole }: QaGameProps) {
  const submitted = state.submittedRoles.includes(meRole);
  const roundVisual = state.reveal ? createQaRoundVisual(state.reveal) : null;
  const resultHero = createQaResultHero(state);
  const timeline = createQaTimeline(state.history);

  return (
    <section className="stack-lg" data-testid="qa-game">
      <Scoreboard
        scores={state.scores}
        meRole={meRole}
        subtitle={`Runda ${state.round}/${state.totalRounds}`}
      />

      <section className="section-block">
        <div className="section-header">
          <h2>Runda pytań</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "in_round" && state.currentQuestion ? (
          <div className="stack motion-fade-up" key={`qa-round-${state.round}`}>
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
                      gameId: "qa-lightning",
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
          <div className="stack motion-fade-up" key={`qa-reveal-${state.reveal.round}`}>
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

            <div className="decision-grid">
              {roundVisual?.decisions.map((decision) => (
                <article key={decision.title} className={`decision-card decision-card--${decision.tone}`}>
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

            {roundVisual ? <PointBreakdown title="Punkty tej rundy" items={roundVisual.points} /> : null}
            <RoundTimeline items={timeline} />

            <button
              className="btn"
              type="button"
              onClick={() => onAction({ gameId: "qa-lightning", type: "advance" })}
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
                onClick={() => onAction({ gameId: "qa-lightning", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "qa-lightning", type: "return_lobby" })}
              >
                Powrót do lobby
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <QuestionCreateForm gameId="qa-lightning" onAddQuestion={onAddQuestion} />
    </section>
  );
}
