import { createTopBarModel } from "../lib/ui-state";
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
    : model.gameLabel;

  return (
    <header className="top-status" data-testid="top-status-bar">
      <div className="top-status__line">
        <strong className="top-status__brand">
          <img src="/assets/icons/duoplay-mark.svg" alt="" aria-hidden="true" className="brand-mark" />
          DuoPlay
        </strong>
        <span className="top-status__theme" aria-hidden="true">
          {themeMode === "system" ? "Auto" : themeMode === "light" ? "Jasny" : "Ciemny"}
        </span>
      </div>
      <div className="top-status__line top-status__line--sub">
        <div className="top-status__state">
          <span className="top-status__item top-status__item--role">{model.roleLabel}</span>
          <span className={`status-dot status-dot--${model.connectionStatus}`} aria-hidden="true" />
          <span className="top-status__item">{model.connectionLabel}</span>
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
