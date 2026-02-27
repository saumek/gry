import type { PresenceState, Role } from "../lib/types";

const roleLabels: Record<Role, string> = {
  Sami: "Sami",
  Patryk: "Patryk"
};

type PresenceStripProps = {
  presence: PresenceState;
  meRole?: Role;
};

export function PresenceStrip({ presence, meRole }: PresenceStripProps) {
  return (
    <section className="section-block" data-testid="presence-strip">
      <h2>Status osób</h2>
      <div className="presence-grid">
        {(Object.keys(roleLabels) as Role[]).map((role) => {
          const online = presence.online[role];
          const occupied = presence.occupiedRoles.includes(role);

          return (
            <article key={role} className={`presence-pill ${online ? "is-online" : ""}`}>
              <div>
                <strong>{roleLabels[role]}</strong>
                {meRole === role ? <span className="me-tag">To Ty</span> : null}
              </div>
              <small>
                {online ? "Online" : occupied ? "Rozłączony" : "Wolny"}
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
