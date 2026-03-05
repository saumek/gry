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
    <section className="section-block settings-panel" data-testid="settings-panel">
      <div className="section-header">
        <h2>Ustawienia</h2>
        <span className="chip chip--soft">Lokalne</span>
      </div>

      <div className="settings-row">
        <div className="settings-row__copy">
          <strong>Motyw</strong>
          <p className="muted">Przełącz widok systemowy, jasny albo ciemny.</p>
        </div>
        <ThemeToggle value={themeMode} onChange={onThemeChange} />
      </div>

      <div className="settings-row">
        <div className="settings-row__copy">
          <strong>Dźwięki akcji</strong>
          <p className="muted">Krótki sygnał po potwierdzeniu lub błędzie akcji.</p>
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
