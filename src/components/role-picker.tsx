"use client";

import type { Role } from "../lib/types";

type RolePickerProps = {
  availableRoles: Role[];
  onPick: (role: Role) => void;
};

export function RolePicker({ availableRoles, onPick }: RolePickerProps) {
  return (
    <section className="section-block entry-panel" data-testid="role-picker">
      <h2>Wybierz użytkownika</h2>
      <p className="entry-panel__lead">W pokoju są dostępne oba miejsca. Wybierz swoje imię.</p>
      <div className="grid-two grid-two--tight">
        {availableRoles.map((role) => (
          <button
            key={role}
            className="btn btn--ghost"
            type="button"
            onClick={() => onPick(role)}
            data-testid={`pick-role-${role}`}
          >
            {role}
          </button>
        ))}
      </div>
    </section>
  );
}
