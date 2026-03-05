import { gamesRegistry } from "../games/registry";
import { getGameCatalogItem } from "../lib/game-catalog";
import { AppIcon } from "./app-icon";
import type {
  GameConfigPayload,
  GameId,
  GameStartPayload,
  GameStatusPayload,
  PresenceState,
  QuizCategory,
  Role
} from "../lib/types";

type GameReadyPanelProps = {
  meRole: Role;
  state: GameStatusPayload;
  presence: PresenceState;
  onReadyChange: (gameId: GameId, ready: boolean) => void;
  onStart: (payload: GameStartPayload) => void;
  onConfigure: (payload: GameConfigPayload) => void;
};

export function GameReadyPanel({
  meRole,
  state,
  presence,
  onReadyChange,
  onStart,
  onConfigure
}: GameReadyPanelProps) {
  const selectedCategory = state.configByGame["science-quiz"]?.category ?? "matma";

  return (
    <section className="section-block lobby-panel" data-testid="lobby-games">
      <header className="section-header">
        <h2>Lobby</h2>
        <span className="chip chip--soft">2 osoby</span>
      </header>

      <div className="lobby-overview">
        {(["Sami", "Patryk"] as const).map((role) => {
          const online = presence.online[role];
          const occupied = presence.occupiedRoles.includes(role);
          const stateLabel = online ? "Online" : occupied ? "Rozłączony" : "Wolny";

          return (
            <article className={`lobby-person ${online ? "is-online" : ""}`} key={role}>
              <div className="lobby-person__main">
                <strong>{role}</strong>
                {meRole === role ? <span className="me-tag">To Ty</span> : null}
              </div>
              <small>{stateLabel}</small>
            </article>
          );
        })}
      </div>

      <p className="lobby-note">Obie osoby klikają Gotowy, potem Start.</p>

      <div className="game-list">
        {gamesRegistry.map((game) => {
          const catalog = getGameCatalogItem(game.id);
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
              <div className="game-row__main">
                <div className="game-row__title">
                  <h3>
                    <AppIcon src={catalog.iconPath} className="inline-icon" />
                    {game.title}
                  </h3>
                  <span className="status-pill">{thisGameActive ? "Aktywna" : `${readyCount}/2 got.`}</span>
                </div>
                <p className="game-row__description muted">{game.description}</p>

                <div className="game-row__meta">
                  <span className="game-row__meta-label">
                    {thisGameActive ? "Trwa sesja" : readyCount > 0 ? "Czeka na gotowość" : "Gotowa do startu"}
                  </span>

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
                </div>
              </div>

              <div className="row-actions game-row__actions">
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
