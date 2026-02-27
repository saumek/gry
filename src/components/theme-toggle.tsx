"use client";

import type { ThemeMode } from "../lib/types";

type ThemeToggleProps = {
  value: ThemeMode;
  onChange: (next: ThemeMode) => void;
};

const modes: Array<{ id: ThemeMode; label: string; icon: string }> = [
  { id: "system", label: "Auto", icon: "/assets/icons/trophy.svg" },
  { id: "light", label: "Jasny", icon: "/assets/icons/sun.svg" },
  { id: "dark", label: "Ciemny", icon: "/assets/icons/moon.svg" }
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
          <img className="theme-toggle__icon" src={mode.icon} alt="" aria-hidden="true" />
          <span className="sr-only">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
