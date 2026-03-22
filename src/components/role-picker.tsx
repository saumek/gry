"use client";

import { displayRoleName } from "../lib/ui-state";
import type { Role } from "../lib/types";

type RolePickerProps = {
  availableRoles: Role[];
  onPick: (role: Role) => void;
};

const allRoles: Role[] = ["Sami", "Patryk"];

export function RolePicker({ availableRoles, onPick }: RolePickerProps) {
  return (
    <section className="entry-screen" data-testid="role-picker">
      <div className="duel-hero duel-hero--chooser">
        <p className="duel-hero__eyebrow">Choose Your Side</p>
        <h1 className="duel-hero__title">
          PLAYER <span>SELECT</span>
        </h1>
        <p className="duel-hero__copy">
          Kod jest poprawny. Wybierz, czy w tej sesji grasz jako Samuel czy Patryk.
        </p>
      </div>

      <div className="duel-role-stack">
        {allRoles.map((role, index) => {
          const isAvailable = availableRoles.includes(role);
          const accent = role === "Sami" ? "primary" : "secondary";

          return (
            <button
              key={role}
              className={`duel-role-card duel-role-card--${accent} ${index === 1 ? "is-shifted" : ""} ${
                !isAvailable ? "is-muted" : ""
              }`}
              type="button"
              disabled={!isAvailable}
              onClick={() => onPick(role)}
              data-testid={`pick-role-${role}`}
            >
              <div className="duel-role-card__avatar">{displayRoleName(role).slice(0, 1)}</div>
              <div className="duel-role-card__copy">
                <div className="duel-role-card__meta">
                  <span>{role === "Sami" ? "PLAYER 01" : "PLAYER 02"}</span>
                  <span className={`duel-role-card__pulse ${isAvailable ? "is-live" : ""}`} />
                </div>
                <strong>{displayRoleName(role)}</strong>
                <small>{isAvailable ? "Kliknij, aby wejść do lobby" : "Miejsce chwilowo zajęte"}</small>
              </div>
              <span className="duel-role-card__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
