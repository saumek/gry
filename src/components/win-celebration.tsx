import type { GameEndReason, GameScore, Role } from "../lib/types";

type WinCelebrationProps = {
  visible: boolean;
  winnerRole?: Role;
  endReason: GameEndReason;
  scores: GameScore;
};

export function WinCelebration({ visible, winnerRole, endReason, scores }: WinCelebrationProps) {
  if (!visible) {
    return null;
  }

  const title =
    endReason === "aborted"
      ? "Gra przerwana"
      : winnerRole
        ? `Wygrywa ${winnerRole}`
        : "Remis";

  return (
    <aside className="win-celebration" aria-live="polite">
      <div className="win-celebration__inner">
        <p className="win-celebration__icon" aria-hidden="true">
          {endReason === "aborted" ? "•" : winnerRole ? "★" : "≈"}
        </p>
        <h2>{title}</h2>
        <p>{`Sami ${scores.Sami} : ${scores.Patryk} Patryk`}</p>
      </div>
    </aside>
  );
}
