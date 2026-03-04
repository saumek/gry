"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createPrioritiesResultHero,
  createPrioritiesRoundVisual,
  createPrioritiesTimeline
} from "../lib/game-visuals/priorities-visuals";
import { useRevealAutoAdvance } from "../lib/use-reveal-auto-advance";
import { phaseShortLabel } from "../lib/ui-state";
import type { CouplePrioritiesGameState, GameActionPayload } from "../lib/types";
import { PointBreakdown } from "./point-breakdown";
import { ResultChip } from "./result-chip";
import { ResultHero } from "./result-hero";
import { RoundTimeline } from "./round-timeline";
import { Scoreboard } from "./scoreboard";

type CouplePrioritiesGameProps = {
  state: CouplePrioritiesGameState;
  meRole: "Sami" | "Patryk";
  onAction: (payload: GameActionPayload) => void;
};

export function CouplePrioritiesGame({ state, meRole, onAction }: CouplePrioritiesGameProps) {
  const [ranking, setRanking] = useState<number[]>([]);
  const [guessPartnerTop, setGuessPartnerTop] = useState<number | null>(null);
  const submitted = state.submittedRoles.includes(meRole);
  const roundVisual = state.reveal ? createPrioritiesRoundVisual(state.reveal) : null;
  const resultHero = createPrioritiesResultHero(state);
  const timeline = createPrioritiesTimeline(state.history);

  useEffect(() => {
    if (state.phase === "in_round") {
      setRanking([]);
      setGuessPartnerTop(null);
    }
  }, [state.phase, state.round, state.sessionId]);

  const canSubmit = useMemo(
    () => ranking.length === 4 && guessPartnerTop !== null,
    [ranking.length, guessPartnerTop]
  );
  const autoAdvance = useRevealAutoAdvance({
    enabled: state.phase === "reveal",
    phase: state.phase,
    roundKey: `priorities-${state.sessionId}-${state.reveal?.round ?? state.round}`,
    onAdvance: () => onAction({ gameId: "couple-priorities", type: "advance" })
  });

  return (
    <section className="stack-lg" data-testid="couple-priorities-game">
      <Scoreboard
        scores={state.scores}
        meRole={meRole}
        subtitle={`Runda ${state.round}/${state.totalRounds}`}
      />

      <section className="section-block">
        <div className="section-header">
          <h2>Priorytety pary</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "in_round" && state.currentPrompt ? (
          <div
            className="stack motion-fade-up phase-panel phase-panel--in-round"
            key={`cp-round-${state.round}`}
          >
            <h3>{state.currentPrompt.text}</h3>
            {state.currentPrompt.smartMeta ? (
              <p className="smart-hint">{state.currentPrompt.smartMeta.reason}</p>
            ) : null}

            <div className="stack">
              <p className="label">Ułóż ranking 1-4</p>
              <div className="option-grid">
                {state.currentPrompt.options.map((option, index) => {
                  const order = ranking.indexOf(index);
                  const selected = order !== -1;

                  return (
                    <button
                      key={`rank-${option}`}
                      className={`btn btn--ghost btn--interactive ${selected ? "is-selected" : ""}`}
                      type="button"
                      disabled={submitted}
                      onClick={() => {
                        setRanking((prev) => {
                          if (prev.includes(index)) {
                            return prev.filter((value) => value !== index);
                          }

                          if (prev.length >= 4) {
                            return prev;
                          }

                          return [...prev, index];
                        });
                      }}
                    >
                      {selected ? `${order + 1}. ` : ""}
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stack">
              <p className="label">Jaką opcję partner dał na #1?</p>
              <div className="option-grid">
                {state.currentPrompt.options.map((option, index) => (
                  <button
                    key={`guess-${option}`}
                    className={`btn btn--ghost btn--interactive ${guessPartnerTop === index ? "is-selected" : ""}`}
                    type="button"
                    disabled={submitted}
                    onClick={() => setGuessPartnerTop(index)}
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
                if (guessPartnerTop === null || ranking.length !== 4) {
                  return;
                }

                onAction({
                  gameId: "couple-priorities",
                  type: "submit",
                  ranking: ranking as [number, number, number, number],
                  guessPartnerTop
                });
              }}
            >
              Zatwierdź ranking
            </button>

            <div className="result-chip-row">
              {submitted ? (
                <ResultChip tone="warning" icon="•" label="Ranking zapisany - czekasz na reveal" />
              ) : (
                <ResultChip tone="info" icon="•" label="Wybierz 4 pozycje i typ partnera" />
              )}
            </div>
          </div>
        ) : null}

        {state.phase === "reveal" && state.reveal ? (
          <div
            className="stack motion-fade-up phase-panel phase-panel--reveal"
            key={`cp-reveal-${state.reveal.round}`}
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

            <div className="decision-grid">
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
                  {decision.detail ? <small>{decision.detail}</small> : null}
                </article>
              ))}
            </div>

            {roundVisual ? <PointBreakdown title="Skąd punkty" items={roundVisual.points} /> : null}
            <RoundTimeline items={timeline} />
            <div className="auto-advance-row">
              <ResultChip
                tone={autoAdvance.isPaused ? "warning" : "info"}
                icon="•"
                label={
                  autoAdvance.isPaused
                    ? "Auto-przejście wstrzymane"
                    : `Auto-przejście za ${autoAdvance.secondsLeft.toFixed(1)}s`
                }
              />
              {!autoAdvance.isPaused ? (
                <button className="btn btn--ghost btn--small" type="button" onClick={autoAdvance.pause}>
                  Zostań
                </button>
              ) : null}
            </div>

            <button
              className="btn"
              type="button"
              onClick={() => onAction({ gameId: "couple-priorities", type: "advance" })}
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
                onClick={() => onAction({ gameId: "couple-priorities", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "couple-priorities", type: "return_lobby" })}
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
