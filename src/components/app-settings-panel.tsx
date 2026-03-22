"use client";

import type { ThemeMode } from "../lib/types";
import { ThemeToggle } from "./theme-toggle";

type AppSettingsPanelProps = {
  themeMode: ThemeMode;
  onThemeChange: (next: ThemeMode) => void;
  soundCuesEnabled: boolean;
  onToggleSoundCues: () => void;
};

export function AppSettingsPanel({
  themeMode,
  onThemeChange,
  soundCuesEnabled,
  onToggleSoundCues
}: AppSettingsPanelProps) {
  return (
    <section className="section-block settings-panel settings-panel--duel" data-testid="settings-panel">
      <div className="section-header section-header--duel">
        <div>
          <p className="section-kicker">Control Deck</p>
          <h2>Ustawienia</h2>
        </div>
        <span className="chip chip--soft">Lokalne</span>
      </div>

      <div className="settings-row">
        <div className="settings-row__copy">
          <strong>Motyw</strong>
          <p className="muted">Przełącz wariant interfejsu bez zmiany układu gry.</p>
        </div>
        <ThemeToggle value={themeMode} onChange={onThemeChange} />
      </div>

      <div className="settings-row">
        <div className="settings-row__copy">
          <strong>Dźwięki akcji</strong>
          <p className="muted">Krótki sygnał po zapisaniu ruchu albo po błędzie.</p>
        </div>
        <button
          type="button"
          className={`settings-toggle ${soundCuesEnabled ? "is-active" : ""}`}
          onClick={onToggleSoundCues}
          aria-pressed={soundCuesEnabled}
          data-testid="settings-sound-toggle"
        >
          <span className="settings-toggle__thumb" aria-hidden="true" />
          <span>{soundCuesEnabled ? "Włączone" : "Wyłączone"}</span>
        </button>
      </div>
    </section>
  );
}
