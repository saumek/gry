import { gamesRegistry } from "../games/registry";

function statusLabel(status: string): string {
  if (status === "beta") {
    return "Beta";
  }

  if (status === "aktywna") {
    return "Aktywna";
  }

  return "W przygotowaniu";
}

export function GamesGrid() {
  return (
    <section className="section-block">
      <div className="section-header">
        <h2>Platforma gier</h2>
        <span className="chip chip--soft">Core gotowy</span>
      </div>

      <div className="game-list">
        {gamesRegistry.map((game) => (
          <article className="game-row" key={game.id}>
            <div className="game-row__title">
              <h3>{game.title}</h3>
              <span className="status-pill">{statusLabel(game.status)}</span>
            </div>
            <p className="muted">{game.description}</p>
            {game.eta ? <small>Plan: {game.eta}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
