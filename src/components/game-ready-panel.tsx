import { gamesRegistry } from "../games/registry";
import type { GameId, GameStatusPayload, Role } from "../lib/types";

type GameReadyPanelProps = {
  meRole: Role;
  state: GameStatusPayload;
  onReadyChange: (gameId: GameId, ready: boolean) => void;
  onStart: (gameId: GameId) => void;
};

export function GameReadyPanel({ meRole, state, onReadyChange, onStart }: GameReadyPanelProps) {
  return (
    <section className="section-block" data-testid="lobby-games">
      <header className="section-header">
        <h2>Wybór gry</h2>
        <span className="chip chip--soft">Obie osoby klikają Gotowy</span>
      </header>

      <div className="game-list">
        {gamesRegistry.map((game) => {
          const ready = state.readyByGame[game.id];
          const activeElsewhere =
            state.activeGameId !== null &&
            state.activeGameId !== game.id &&
            state.activeGame?.phase !== "finished";
          const thisGameActive = state.activeGameId === game.id;
          const readyCount = Number(ready.Sami) + Number(ready.Patryk);

          return (
            <article
              className={`game-row ${thisGameActive ? "is-active" : ""}`}
              key={game.id}
              data-testid={`game-row-${game.id}`}
            >
              <div className="game-row__title">
                <h3>{game.title}</h3>
                <span className="status-pill">{thisGameActive ? "Aktywna" : "Lobby"}</span>
              </div>
              <p className="muted">{game.description}</p>
              <p className="muted">{`Gotowi: ${readyCount}/2`}</p>
              <div className="row-actions">
                <button
                  className="btn btn--ghost btn--small"
                  type="button"
                  disabled={activeElsewhere}
                  onClick={() => onReadyChange(game.id, !ready[meRole])}
                  data-testid={`ready-${game.id}`}
                >
                  {ready[meRole] ? "Cofnij gotowość" : "Gotowy"}
                </button>

                <button
                  className="btn btn--small"
                  type="button"
                  disabled={activeElsewhere || !ready.Sami || !ready.Patryk}
                  onClick={() => onStart(game.id)}
                  data-testid={`start-${game.id}`}
                >
                  {thisGameActive ? "Wznów" : "Start"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
