import type { AppTab, NavItemModel } from "../lib/types";

type BottomNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
  historyCount: number;
  gameActive: boolean;
};

const navItems: NavItemModel[] = [
  { id: "game", label: "Gra", icon: "G" },
  { id: "lobby", label: "Lobby", icon: "L" },
  { id: "history", label: "Historia", icon: "H" }
];

export function BottomNav({ activeTab, onChange, historyCount, gameActive }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Nawigacja aplikacji" data-testid="bottom-nav">
      {navItems.map((item) => {
        const isActive = item.id === activeTab;
        const badge = item.id === "history" ? Math.min(99, historyCount) : 0;

        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav__item ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(item.id)}
            aria-pressed={isActive}
            data-testid={`tab-${item.id}`}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {badge > 0 ? <span className="bottom-nav__badge" data-testid={`tab-badge-${item.id}`}>{badge}</span> : null}
            {gameActive && item.id === "game" ? <span className="sr-only">Aktywna gra</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
