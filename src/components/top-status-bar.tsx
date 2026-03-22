import { createTopBarModel, displayRoleName } from "../lib/ui-state";
import type { ActiveGameState, ConnectionStatus, ThemeMode, Role } from "../lib/types";

type TopStatusBarProps = {
  meRole?: Role;
  activeGame: ActiveGameState | null;
  connectionStatus: ConnectionStatus;
  connectionLabel: string;
  themeMode: ThemeMode;
};

export function TopStatusBar({
  meRole,
  activeGame,
  connectionStatus,
  connectionLabel,
  themeMode
}: TopStatusBarProps) {
  const model = createTopBarModel(meRole, activeGame, connectionStatus, connectionLabel);
  const gameSummary = activeGame
    ? [model.gameLabel, model.phaseLabel, model.scoreLabel].filter(Boolean).join(" · ")
    : "Brak aktywnej gry";

  return (
    <header className="top-status" data-testid="top-status-bar">
      <div className="top-status__line top-status__line--brand">
        <div className={`top-status__avatar ${meRole ? "is-ready" : ""}`} aria-hidden="true">
          {meRole ? displayRoleName(meRole).slice(0, 1) : "?"}
        </div>
        <div className="top-status__brand-wrap">
          <span className="top-status__eyebrow">Samuel + Patryk</span>
          <strong className="top-status__brand">DUOPLAY</strong>
        </div>
        <span className="top-status__theme" aria-hidden="true">
          {themeMode === "system" ? "AUTO" : themeMode === "light" ? "LIGHT" : "DARK"}
        </span>
      </div>

      <div className="top-status__line top-status__line--sub">
        <div className="top-status__state">
          <span className="top-status__item top-status__item--role">{model.roleLabel}</span>
          <span className={`status-dot status-dot--${connectionStatus}`} aria-hidden="true" />
          <span className="top-status__item">{connectionLabel}</span>
        </div>

        <div className="top-status__summary" aria-label={gameSummary}>
          <span className="top-status__game">{gameSummary}</span>
          {model.jumpToResult ? (
            <a className="jump-link" href="#game-result-section">
              Wynik
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
