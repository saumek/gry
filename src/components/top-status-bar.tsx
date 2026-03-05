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

  return (
    <header className="top-status" data-testid="top-status-bar">
      <strong className="top-status__brand">
        <img src="/assets/icons/duoplay-mark.svg" alt="" aria-hidden="true" className="brand-mark" />
        DuoPlay
      </strong>
      <div className="top-status__state">
        <span className="top-status__item top-status__item--role">{model.roleLabel}</span>
        <span className={`status-dot status-dot--${model.connectionStatus}`} aria-hidden="true" />
        <span className="top-status__item">{model.connectionLabel}</span>
      </div>
      <span className="top-status__theme" aria-hidden="true">
        {themeMode === "system" ? "Auto" : themeMode === "light" ? "Jasny" : "Ciemny"}
      </span>
    </header>
  );
}
