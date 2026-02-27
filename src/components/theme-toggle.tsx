"use client";

import type { ThemeMode } from "../lib/types";

type ThemeToggleProps = {
  value: ThemeMode;
  onChange: (next: ThemeMode) => void;
};

const modes: Array<{ id: ThemeMode; label: string; icon: string }> = [
  { id: "system", label: "Auto", icon: "A" },
  { id: "light", label: "Jasny", icon: "L" },
  { id: "dark", label: "Ciemny", icon: "D" }
];

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label="Tryb kolorystyczny" data-testid="theme-toggle">
      {modes.map((mode) => (
        <button
          key={mode.id}
          className={`theme-toggle__option ${value === mode.id ? "is-active" : ""}`}
          type="button"
          onClick={() => onChange(mode.id)}
          aria-pressed={value === mode.id}
          aria-label={mode.label}
          title={mode.label}
        >
          <span className="theme-toggle__icon" aria-hidden="true">
            {mode.icon}
          </span>
          <span className="sr-only">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
