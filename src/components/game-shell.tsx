"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BetterHalfGame } from "./better-half-game";
import { BattleshipGame } from "./battleship-game";
import { QaGame } from "./qa-game";
import { WinCelebration } from "./win-celebration";
import type {
  ActiveGameState,
  GameActionPayload,
  GameResultPayload,
  QuestionAddPayload,
  Role
} from "../lib/types";

type GameShellProps = {
  meRole: Role;
  activeGame: ActiveGameState;
  latestResult: GameResultPayload | null;
  onAction: (payload: GameActionPayload) => void;
  onAddQuestion: (payload: QuestionAddPayload) => void;
};

export function GameShell({
  meRole,
  activeGame,
  latestResult,
  onAction,
  onAddQuestion
}: GameShellProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationKeyRef = useRef<string>("");
  const endRequest = activeGame.endRequest;

  useEffect(() => {
    if (!endRequest) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [endRequest]);

  const remainingSeconds = useMemo(() => {
    if (!endRequest) {
      return 0;
    }

    return Math.max(0, Math.ceil((new Date(endRequest.expiresAt).getTime() - nowMs) / 1000));
  }, [endRequest, nowMs]);

  const isEndRequester = endRequest?.requestedBy === meRole;
  const meApprovedEnd = endRequest?.approvals.includes(meRole) ?? false;
  const resultForActiveSession =
    latestResult &&
    latestResult.sessionId === activeGame.sessionId &&
    latestResult.gameId === activeGame.gameId
      ? latestResult
      : null;

  useEffect(() => {
    if (activeGame.phase !== "finished") {
      return;
    }

    const key = `${activeGame.gameId}:${activeGame.sessionId}:${resultForActiveSession?.endReason ?? "normal"}`;
    if (celebrationKeyRef.current === key) {
      return;
    }

    celebrationKeyRef.current = key;
    setShowCelebration(true);
    const timer = window.setTimeout(() => {
      setShowCelebration(false);
    }, 950);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeGame.gameId, activeGame.phase, activeGame.sessionId, resultForActiveSession?.endReason]);

  return (
    <section className="stack-lg" data-testid="game-shell">
      <WinCelebration
        visible={showCelebration}
        winnerRole={activeGame.winnerRole}
        endReason={resultForActiveSession?.endReason ?? "normal"}
        scores={activeGame.scores}
      />

      <section className="game-headline sticky-game-header">
        <div className="section-header">
          <h2>{label(activeGame.gameId)}</h2>
          <span className="chip chip--phase">{phaseLabel(activeGame.phase)}</span>
        </div>

        {activeGame.phase !== "finished" && !endRequest ? (
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={() => onAction({ gameId: activeGame.gameId, type: "request_end" })}
          >
            Zakończ grę za zgodą obu osób
          </button>
        ) : null}

        {endRequest ? (
          <section className="end-request-banner" data-testid="end-request-banner">
            {isEndRequester ? (
              <>
                <p>
                  Czekamy na zgodę drugiej osoby. Pozostało około <strong>{remainingSeconds}s</strong>.
                </p>
                <button
                  className="btn btn--ghost btn--small"
                  type="button"
                  onClick={() => onAction({ gameId: activeGame.gameId, type: "reject_end" })}
                >
                  Anuluj prośbę
                </button>
              </>
            ) : (
              <>
                <p>
                  {endRequest.requestedBy} prosi o zakończenie gry. Pozostało około{" "}
                  <strong>{remainingSeconds}s</strong>.
                </p>
                {!meApprovedEnd ? (
                  <div className="row-actions">
                    <button
                      className="btn btn--small"
                      type="button"
                      onClick={() => onAction({ gameId: activeGame.gameId, type: "approve_end" })}
                    >
                      Potwierdź
                    </button>
                    <button
                      className="btn btn--ghost btn--small"
                      type="button"
                      onClick={() => onAction({ gameId: activeGame.gameId, type: "reject_end" })}
                    >
                      Odrzuć
                    </button>
                  </div>
                ) : (
                  <p className="muted">Twoja zgoda zapisana. Czekamy na decyzję partnera.</p>
                )}
              </>
            )}
          </section>
        ) : null}
      </section>

      {activeGame.gameId === "qa-lightning" ? (
        <QaGame
          state={activeGame}
          meRole={meRole}
          onAction={onAction}
          onAddQuestion={onAddQuestion}
        />
      ) : null}

      {activeGame.gameId === "better-half" ? (
        <BetterHalfGame
          state={activeGame}
          meRole={meRole}
          onAction={onAction}
          onAddQuestion={onAddQuestion}
        />
      ) : null}

      {activeGame.gameId === "mini-battleship" ? (
        <BattleshipGame state={activeGame} meRole={meRole} onAction={onAction} />
      ) : null}
    </section>
  );
}

function label(gameId: ActiveGameState["gameId"]): string {
  if (gameId === "qa-lightning") {
    return "Pytania i odpowiedzi";
  }

  if (gameId === "better-half") {
    return "Jak odpowie druga połówka";
  }

  return "Mini Statki 5x5";
}

function phaseLabel(phase: ActiveGameState["phase"]): string {
  if (phase === "in_round") {
    return "W trakcie";
  }

  if (phase === "reveal") {
    return "Reveal";
  }

  if (phase === "finished") {
    return "Koniec";
  }

  if (phase === "setup") {
    return "Setup";
  }

  return phase;
}
