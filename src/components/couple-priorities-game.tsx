"use client";

import { useEffect, useMemo, useState } from "react";

import { couplePrioritiesRevealBadges, winnerBadge } from "../lib/score-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type { CouplePrioritiesGameState, GameActionPayload } from "../lib/types";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
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
          <div className="stack motion-fade-up" key={`cp-round-${state.round}`}>
            <h3>{state.currentPrompt.text}</h3>

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
          <div className="stack motion-fade-up" key={`cp-reveal-${state.reveal.round}`}>
            <RoundResultStrip
              title={`Runda ${state.reveal.round} - zgodność`}
              description={state.reveal.prompt.text}
              badges={couplePrioritiesRevealBadges(state.reveal)}
            />

            <div className="answer-grid">
              <article className="answer-card">
                <strong>Sami</strong>
                <p>{formatRanking(state.reveal.submissions.Sami.ranking, state.reveal.prompt.options)}</p>
                <p>{`Top-1 typ: ${state.reveal.prompt.options[state.reveal.submissions.Sami.guessPartnerTop]}`}</p>
                <p>{`Punkty rundy: ${state.reveal.roundPoints.Sami}`}</p>
              </article>
              <article className="answer-card">
                <strong>Patryk</strong>
                <p>{formatRanking(state.reveal.submissions.Patryk.ranking, state.reveal.prompt.options)}</p>
                <p>{`Top-1 typ: ${state.reveal.prompt.options[state.reveal.submissions.Patryk.guessPartnerTop]}`}</p>
                <p>{`Punkty rundy: ${state.reveal.roundPoints.Patryk}`}</p>
              </article>
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
          <div className="stack motion-fade-up" id="game-result-section" data-testid="game-result-section">
            <RoundResultStrip
              title="Koniec gry"
              description="Podsumowanie sesji"
              badges={[winnerBadge(state.scores, state.winnerRole)]}
            />

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

function formatRanking(
  ranking: [number, number, number, number],
  options: [string, string, string, string]
): string {
  return ranking.map((optionIndex, index) => `${index + 1}. ${options[optionIndex]}`).join(" · ");
}
