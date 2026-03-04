"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ActionFeedbackModel } from "../lib/action-feedback";
import { WinCelebration } from "./win-celebration";
import { getGameCatalogItem } from "../lib/game-catalog";
import { phaseShortLabel } from "../lib/ui-state";
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
  actionFeedback: ActionFeedbackModel | null;
  onRetryAction: () => void;
};

const QaGame = dynamic(() => import("./qa-game").then((mod) => mod.QaGame), {
  ssr: false
});
const BetterHalfGame = dynamic(() => import("./better-half-game").then((mod) => mod.BetterHalfGame), {
  ssr: false
});
const BattleshipGame = dynamic(() => import("./battleship-game").then((mod) => mod.BattleshipGame), {
  ssr: false
});
const ScienceQuizGame = dynamic(() => import("./science-quiz-game").then((mod) => mod.ScienceQuizGame), {
  ssr: false
});
const CouplePrioritiesGame = dynamic(
  () => import("./couple-priorities-game").then((mod) => mod.CouplePrioritiesGame),
  { ssr: false }
);

export function GameShell({
  meRole,
  activeGame,
  latestResult,
  onAction,
  onAddQuestion,
  actionFeedback,
  onRetryAction
}: GameShellProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationKeyRef = useRef<string>("");
  const endRequest = activeGame.endRequest;
  const actionFocusText =
    activeGame.phase === "finished"
      ? "Sprawdź wynik końcowy i wybierz: Rewanż albo Powrót do lobby."
      : endRequest
        ? "Trwa proces zakończenia gry za zgodą obu osób."
        : "Wykonaj akcję rundy poniżej, aby kontynuować grę.";
  const activeCatalog = getGameCatalogItem(activeGame.gameId);

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
  const feedbackForGame =
    actionFeedback && actionFeedback.gameId === activeGame.gameId ? actionFeedback : null;
  const feedbackLabel =
    feedbackForGame?.state === "sending"
      ? "Wysyłanie..."
      : feedbackForGame?.state === "acked"
        ? "Akcja potwierdzona"
        : feedbackForGame?.state === "waiting_peer"
          ? "Czekasz na drugą osobę"
          : feedbackForGame?.state === "resolved"
            ? "Gotowe"
            : feedbackForGame?.state === "failed"
              ? "Nie udało się wysłać"
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

      <section className="game-headline sticky-game-header" data-testid="game-headline">
        <div className="section-header">
          <h2>{activeCatalog.title}</h2>
          <span className="chip chip--phase">{phaseShortLabel(activeGame.phase)}</span>
        </div>
        <p className="muted">{actionFocusText}</p>
        {feedbackForGame && feedbackLabel ? (
          <div className={`action-feedback-strip action-feedback-strip--${feedbackForGame.state}`}>
            <span>{feedbackForGame.label}</span>
            <strong>{feedbackLabel}</strong>
            {feedbackForGame.state === "failed" ? (
              <button className="btn btn--ghost btn--small" type="button" onClick={onRetryAction}>
                Spróbuj ponownie
              </button>
            ) : null}
          </div>
        ) : null}
        {activeCatalog.revealIllustration && (activeGame.phase === "reveal" || activeGame.phase === "finished") ? (
          <img
            className="game-hero-illustration"
            src={activeCatalog.revealIllustration}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        ) : null}

        {activeGame.phase !== "finished" && !endRequest ? (
          <button
            className="btn btn--ghost btn--small btn--inline"
            type="button"
            onClick={() => onAction({ gameId: activeGame.gameId, type: "request_end" })}
          >
            Zakończ za zgodą
          </button>
        ) : null}

        {endRequest ? (
          <section className="end-request-banner" data-testid="end-request-banner">
            {isEndRequester ? (
              <>
                <p>
                  Czekamy na zgodę partnera. <strong>{remainingSeconds}s</strong>.
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
                  {endRequest.requestedBy} chce zakończyć grę. <strong>{remainingSeconds}s</strong>.
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

      {activeGame.gameId === "science-quiz" ? (
        <ScienceQuizGame state={activeGame} meRole={meRole} onAction={onAction} />
      ) : null}

      {activeGame.gameId === "couple-priorities" ? (
        <CouplePrioritiesGame state={activeGame} meRole={meRole} onAction={onAction} />
      ) : null}
    </section>
  );
}
