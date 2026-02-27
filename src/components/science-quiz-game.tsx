"use client";

import { scienceQuizRevealBadges, winnerBadge } from "../lib/score-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type { GameActionPayload, ScienceQuizGameState } from "../lib/types";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
import { Scoreboard } from "./scoreboard";

type ScienceQuizGameProps = {
  state: ScienceQuizGameState;
  meRole: "Sami" | "Patryk";
  onAction: (payload: GameActionPayload) => void;
};

export function ScienceQuizGame({ state, meRole, onAction }: ScienceQuizGameProps) {
  const submitted = state.submittedRoles.includes(meRole);

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
            <RoundResultStrip
              title={`Runda ${state.reveal.round} - wynik`}
              description={state.reveal.question.text}
              badges={scienceQuizRevealBadges(state.reveal)}
            />

            <div className="answer-grid">
              <article className="answer-card">
                <strong>Poprawna</strong>
                <p>{state.reveal.question.options[state.reveal.correctIndex]}</p>
              </article>
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
              onClick={() => onAction({ gameId: "science-quiz", type: "advance" })}
            >
              {state.round >= state.totalRounds ? "Pokaż wynik końcowy" : "Następna runda"}
            </button>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="stack motion-fade-up" id="game-result-section" data-testid="game-result-section">
            <RoundResultStrip
              title="Koniec quizu"
              description="Podsumowanie wszystkich rund"
              badges={[winnerBadge(state.scores, state.winnerRole)]}
            />

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
  if (category === "matma") {
    return "Matma";
  }

  if (category === "geografia") {
    return "Geografia";
  }

  if (category === "nauka") {
    return "Nauka";
  }

  return "Wiedza ogólna";
}
