"use client";

import { useMemo, useState } from "react";

import {
  createBetterHalfResultHero,
  createBetterHalfRoundVisual,
  createBetterHalfTimeline
} from "../lib/game-visuals/better-half-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type {
  BetterHalfGameState,
  GameActionPayload,
  QuestionAddPayload
} from "../lib/types";
import { PointBreakdown } from "./point-breakdown";
import { QuestionCreateForm } from "./question-create-form";
import { ResultChip } from "./result-chip";
import { ResultHero } from "./result-hero";
import { RoundTimeline } from "./round-timeline";
import { Scoreboard } from "./scoreboard";

type BetterHalfGameProps = {
  state: BetterHalfGameState;
  meRole: "Sami" | "Patryk";
  onAction: (payload: GameActionPayload) => void;
  onAddQuestion: (payload: QuestionAddPayload) => void;
};

export function BetterHalfGame({ state, meRole, onAction, onAddQuestion }: BetterHalfGameProps) {
  const [selfAnswerIndex, setSelfAnswerIndex] = useState<number | null>(null);
  const [guessAnswerIndex, setGuessAnswerIndex] = useState<number | null>(null);
  const submitted = state.submittedRoles.includes(meRole);
  const roundVisual = state.reveal ? createBetterHalfRoundVisual(state.reveal) : null;
  const resultHero = createBetterHalfResultHero(state);
  const timeline = createBetterHalfTimeline(state.history);

  const canSubmit = useMemo(
    () => selfAnswerIndex !== null && guessAnswerIndex !== null,
    [selfAnswerIndex, guessAnswerIndex]
  );

  return (
    <section className="stack-lg" data-testid="better-half-game">
      <Scoreboard
        scores={state.scores}
        meRole={meRole}
        subtitle={`Runda ${state.round}/${state.totalRounds}`}
      />

      <section className="section-block">
        <div className="section-header">
          <h2>Runda dopasowania</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "in_round" && state.currentQuestion ? (
          <div
            className="stack motion-fade-up phase-panel phase-panel--in-round"
            key={`bh-round-${state.round}`}
          >
            <h3>{state.currentQuestion.text}</h3>

            <div className="stack">
              <p className="label">Twoja odpowiedź</p>
              <div className="option-grid">
                {state.currentQuestion.options.map((option, index) => (
                  <button
                    key={`self-${option}`}
                    className={`btn btn--ghost btn--interactive ${selfAnswerIndex === index ? "is-selected" : ""}`}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelfAnswerIndex(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="stack">
              <p className="label">Jak odpowie partner?</p>
              <div className="option-grid">
                {state.currentQuestion.options.map((option, index) => (
                  <button
                    key={`guess-${option}`}
                    className={`btn btn--ghost btn--interactive ${guessAnswerIndex === index ? "is-selected" : ""}`}
                    type="button"
                    disabled={submitted}
                    onClick={() => setGuessAnswerIndex(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn"
              type="button"
              disabled={submitted || !canSubmit}
              onClick={() => {
                if (selfAnswerIndex === null || guessAnswerIndex === null) {
                  return;
                }

                onAction({
                  gameId: "better-half",
                  type: "submit",
                  selfAnswerIndex,
                  guessPartnerIndex: guessAnswerIndex
                });
              }}
            >
              Zatwierdź
            </button>

            <div className="result-chip-row">
              {submitted ? (
                <ResultChip tone="warning" icon="•" label="Odpowiedź zapisana - czekasz na reveal" />
              ) : (
                <ResultChip tone="info" icon="•" label="Wybierz dwie odpowiedzi" />
              )}
            </div>
          </div>
        ) : null}

        {state.phase === "reveal" && state.reveal ? (
          <div
            className="stack motion-fade-up phase-panel phase-panel--reveal"
            key={`bh-reveal-${state.reveal.round}`}
          >
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

            <div className="decision-grid decision-grid--2x2">
              {roundVisual?.decisions.map((decision) => (
                <article key={decision.title} className={`decision-card decision-card--${decision.tone}`}>
                  <div className="decision-card__head">
                    <span className="decision-card__icon" aria-hidden="true">
                      {decision.icon}
                    </span>
                    <strong>{decision.title}</strong>
                  </div>
                  <p className="decision-card__choice">{decision.choice}</p>
                  {decision.detail ? <small>{decision.detail}</small> : null}
                </article>
              ))}
            </div>

            {roundVisual ? <PointBreakdown title="Punkty tej rundy" items={roundVisual.points} /> : null}
            <RoundTimeline items={timeline} />

            <button
              className="btn"
              type="button"
              onClick={() => onAction({ gameId: "better-half", type: "advance" })}
            >
              {state.round >= state.totalRounds ? "Pokaż wynik końcowy" : "Następna runda"}
            </button>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="stack motion-fade-up phase-panel phase-panel--finished" id="game-result-section" data-testid="game-result-section">
            <ResultHero model={resultHero} />
            <RoundTimeline items={timeline} />

            <div className="result-actions">
              <button
                className="btn"
                type="button"
                onClick={() => onAction({ gameId: "better-half", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "better-half", type: "return_lobby" })}
              >
                Powrót do lobby
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <QuestionCreateForm gameId="better-half" onAddQuestion={onAddQuestion} />
    </section>
  );
}
