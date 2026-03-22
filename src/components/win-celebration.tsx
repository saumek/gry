import type { GameEndReason, GameScore, Role } from "../lib/types";
import { displayRoleName } from "../lib/ui-state";

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
        ? `Wygrywa ${displayRoleName(winnerRole)}`
        : "Remis";

  return (
    <aside className="win-celebration" aria-live="polite">
      <div className="win-celebration__inner">
        <p className="win-celebration__icon" aria-hidden="true">
          {endReason === "aborted" ? "•" : winnerRole ? "★" : "≈"}
        </p>
        <h2>{title}</h2>
        <p>{`Samuel ${scores.Sami} : ${scores.Patryk} Patryk`}</p>
      </div>
    </aside>
  );
}
