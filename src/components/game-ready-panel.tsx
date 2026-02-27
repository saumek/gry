import { gamesRegistry } from "../games/registry";
import type {
  GameConfigPayload,
  GameId,
  GameStartPayload,
  GameStatusPayload,
  QuizCategory,
  Role
} from "../lib/types";

type GameReadyPanelProps = {
  meRole: Role;
  state: GameStatusPayload;
  onReadyChange: (gameId: GameId, ready: boolean) => void;
  onStart: (payload: GameStartPayload) => void;
  onConfigure: (payload: GameConfigPayload) => void;
};

export function GameReadyPanel({
  meRole,
  state,
  onReadyChange,
  onStart,
  onConfigure
}: GameReadyPanelProps) {
  const selectedCategory = state.configByGame["science-quiz"]?.category ?? "matma";

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

              {game.id === "science-quiz" ? (
                <div className="science-config-row">
                  <label className="label" htmlFor="science-category-select">
                    Kategoria
                  </label>
                  <select
                    id="science-category-select"
                    className="input"
                    value={selectedCategory}
                    disabled={activeElsewhere}
                    onChange={(event) => {
                      onConfigure({
                        gameId: "science-quiz",
                        category: event.target.value as QuizCategory
                      });
                    }}
                    data-testid="science-category-select"
                  >
                    <option value="matma">Matma</option>
                    <option value="geografia">Geografia</option>
                    <option value="nauka">Nauka</option>
                    <option value="wiedza-ogolna">Wiedza ogólna</option>
                  </select>
                </div>
              ) : null}

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
                  onClick={() => onStart(toStartPayload(game.id, selectedCategory))}
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

function toStartPayload(gameId: GameId, selectedCategory: QuizCategory): GameStartPayload {
  if (gameId === "science-quiz") {
    return {
      gameId,
      config: {
        category: selectedCategory
      }
    };
  }

  return { gameId } as GameStartPayload;
}
