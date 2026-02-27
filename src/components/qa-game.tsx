"use client";

import { qaRevealBadges, winnerBadge } from "../lib/score-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type { GameActionPayload, QaGameState, QuestionAddPayload } from "../lib/types";
import { QuestionCreateForm } from "./question-create-form";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
import { Scoreboard } from "./scoreboard";

type QaGameProps = {
  state: QaGameState;
  onAction: (payload: GameActionPayload) => void;
  onAddQuestion: (payload: QuestionAddPayload) => void;
  meRole: "Sami" | "Patryk";
};

export function QaGame({ state, onAction, onAddQuestion, meRole }: QaGameProps) {
  const submitted = state.submittedRoles.includes(meRole);

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
            <RoundResultStrip
              title={`Runda ${state.reveal.round} - wynik`}
              description={state.reveal.question.text}
              badges={qaRevealBadges(state.reveal)}
            />

            <div className="answer-grid">
              <article className="answer-card">
                <strong>Sami</strong>
                <p>{state.reveal.question.options[state.reveal.answers.Sami]}</p>
              </article>
              <article className="answer-card">
                <strong>Patryk</strong>
                <p>{state.reveal.question.options[state.reveal.answers.Patryk]}</p>
              </article>
            </div>

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
            <RoundResultStrip
              title="Koniec gry"
              description="Podsumowanie całej sesji"
              badges={[winnerBadge(state.scores, state.winnerRole)]}
            />

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
