"use client";

import { useMemo, useState } from "react";

import { betterHalfRevealBadges, winnerBadge } from "../lib/score-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type {
  BetterHalfGameState,
  GameActionPayload,
  QuestionAddPayload
} from "../lib/types";
import { QuestionCreateForm } from "./question-create-form";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
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
          <div className="stack motion-fade-up" key={`bh-round-${state.round}`}>
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
          <div className="stack motion-fade-up" key={`bh-reveal-${state.reveal.round}`}>
            <RoundResultStrip
              title={`Runda ${state.reveal.round} - trafienia`}
              description={state.reveal.question.text}
              badges={betterHalfRevealBadges(state.reveal)}
            />

            <div className="answer-grid">
              <article className="answer-card">
                <strong>Sami</strong>
                <p>Odp: {state.reveal.question.options[state.reveal.answers.Sami.selfAnswer]}</p>
                <p>Typ: {state.reveal.question.options[state.reveal.answers.Sami.guessPartner]}</p>
              </article>
              <article className="answer-card">
                <strong>Patryk</strong>
                <p>Odp: {state.reveal.question.options[state.reveal.answers.Patryk.selfAnswer]}</p>
                <p>Typ: {state.reveal.question.options[state.reveal.answers.Patryk.guessPartner]}</p>
              </article>
            </div>

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
