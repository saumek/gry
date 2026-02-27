import { ThemeToggle } from "./theme-toggle";
import { createTopBarModel } from "../lib/ui-state";
import type { ActiveGameState, ConnectionStatus, ThemeMode, Role } from "../lib/types";

type TopStatusBarProps = {
  meRole?: Role;
  activeGame: ActiveGameState | null;
  connectionStatus: ConnectionStatus;
  connectionLabel: string;
  themeMode: ThemeMode;
  onThemeChange: (next: ThemeMode) => void;
};

export function TopStatusBar({
  meRole,
  activeGame,
  connectionStatus,
  connectionLabel,
  themeMode,
  onThemeChange
}: TopStatusBarProps) {
  const model = createTopBarModel(meRole, activeGame, connectionStatus, connectionLabel);

  return (
    <header className="top-status" data-testid="top-status-bar">
      <div className="top-status__line">
        <strong className="top-status__brand">DuoPlay</strong>
        <div className="top-status__state">
          <span className="top-status__item">{model.roleLabel}</span>
          <span className={`status-dot status-dot--${model.connectionStatus}`} aria-hidden="true" />
          <span className="top-status__item">{model.connectionLabel}</span>
        </div>
        <ThemeToggle value={themeMode} onChange={onThemeChange} />
      </div>

      <div className="top-status__line top-status__line--sub">
        <p className="top-status__summary">
          <strong>{model.gameLabel}</strong>
          {model.phaseLabel ? <span> · {model.phaseLabel}</span> : null}
          {model.scoreLabel ? <span> · {model.scoreLabel}</span> : null}
        </p>
        {model.jumpToResult ? (
          <a className="jump-link" href="#game-result-section">
            Wynik
          </a>
        ) : null}
      </div>
    </header>
  );
}
