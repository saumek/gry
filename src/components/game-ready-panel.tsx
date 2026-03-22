"use client";

import { useEffect, useState } from "react";

import { gamesRegistry } from "../games/registry";
import { displayRoleName } from "../lib/ui-state";
import { getGameCatalogItem } from "../lib/game-catalog";
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

const roster: Role[] = ["Sami", "Patryk"];

const gameEyebrows: Record<GameId, string> = {
  "qa-lightning": "Szybkie dopasowanie",
  "better-half": "Czytasz drugą osobę",
  "mini-battleship": "Precyzja i blef",
  "science-quiz": "Wiedza kontra czas",
  "couple-priorities": "Wspólne decyzje"
};

export function GameReadyPanel({
  meRole,
  state,
  presence,
  onReadyChange,
  onStart,
  onConfigure
}: GameReadyPanelProps) {
  const fallbackGameId = state.activeGameId ?? gamesRegistry[0]?.id ?? "qa-lightning";
  const [selectedGameId, setSelectedGameId] = useState<GameId>(fallbackGameId);

  useEffect(() => {
    if (state.activeGameId) {
      setSelectedGameId(state.activeGameId);
    }
  }, [state.activeGameId]);

  const selectedCategory = state.configByGame["science-quiz"]?.category ?? "matma";
  const selectedGame = gamesRegistry.find((game) => game.id === selectedGameId) ?? gamesRegistry[0];
  const selectedCatalog = getGameCatalogItem(selectedGame.id);
  const ready = state.readyByGame[selectedGame.id];
  const selectedReadyCount = Number(ready.Sami) + Number(ready.Patryk);
  const activeElsewhere =
    state.activeGameId !== null &&
    state.activeGameId !== selectedGame.id &&
    state.activeGame?.phase !== "finished";
  const thisGameActive = state.activeGameId === selectedGame.id;
  const canStart = thisGameActive || (!activeElsewhere && ready.Sami && ready.Patryk);

  return (
    <section className="duel-lobby" data-testid="lobby-games">
      <section className="duel-feature-card">
        <div className="duel-feature-card__art">
          {selectedCatalog.revealIllustration ? (
            <img src={selectedCatalog.revealIllustration} alt="" aria-hidden="true" loading="lazy" />
          ) : (
            <div className="duel-feature-card__icon-wrap" aria-hidden="true">
              <img src={selectedCatalog.iconPath} alt="" />
            </div>
          )}
        </div>

        <div className="duel-feature-card__overlay">
          <span className={`duel-feature-card__chip ${thisGameActive ? "is-live" : ""}`}>
            {thisGameActive ? "TRWA SESJA" : "DUO LOBBY"}
          </span>
          <p className="duel-feature-card__eyebrow">{gameEyebrows[selectedGame.id]}</p>
          <h2>{selectedGame.title}</h2>
          <p className="duel-feature-card__copy">{selectedGame.description}</p>
          <div className="duel-feature-card__meta">
            <span>{selectedReadyCount}/2 gotowych</span>
            <span className="duel-feature-card__dot" aria-hidden="true" />
            <span>{activeElsewhere ? "Inna gra jest aktywna" : "Start po gotowości obu osób"}</span>
          </div>
        </div>
      </section>

      <div className="duel-lobby__tabs" aria-label="Wybór gry">
        {gamesRegistry.map((game) => {
          const isActive = game.id === selectedGame.id;

          return (
            <button
              key={game.id}
              type="button"
              className={`duel-lobby__tab ${isActive ? "is-active" : ""}`}
              onClick={() => setSelectedGameId(game.id)}
            >
              {getGameCatalogItem(game.id).shortTitle.toUpperCase()}
            </button>
          );
        })}
      </div>

      <section className="duel-stage">
        <header className="duel-stage__header">
          <p className="duel-stage__eyebrow">Challenge Accepted</p>
          <h3>{selectedGame.title}</h3>
          <div className="duel-stage__stability">
            <span className="duel-stage__stability-dot" aria-hidden="true" />
            {activeElsewhere ? "AKTYWNA JEST INNA GRA" : "LOBBY STABILNE"}
          </div>
        </header>

        <div className="duel-stage__players">
          {roster.map((role, index) => {
            const isReady = ready[role];
            const isOnline = presence.online[role];
            const isMe = meRole === role;

            return (
              <article
                key={role}
                className={`duel-player-panel ${isReady ? "is-ready" : ""} ${index === 1 ? "is-secondary" : ""}`}
              >
                <span className={`duel-player-panel__badge ${isReady ? "is-ready" : "is-waiting"}`}>
                  {isReady ? "READY" : isOnline ? "ONLINE" : "OFFLINE"}
                </span>
                <div className="duel-player-panel__avatar" aria-hidden="true">
                  {displayRoleName(role).slice(0, 1)}
                </div>
                <strong>{displayRoleName(role)}</strong>
                <small>{isMe ? "TO TY" : isOnline ? "W pokoju" : "Poza pokojem"}</small>
                <div className={`duel-player-panel__signal ${isReady ? "is-ready" : ""}`} aria-hidden="true" />
              </article>
            );
          })}

          <div className="duel-stage__vs" aria-hidden="true">
            VS
          </div>
        </div>

        <div className="duel-stage__actions">
          <div className="duel-stage__progress" aria-hidden="true">
            <span style={{ width: `${(selectedReadyCount / 2) * 100}%` }} />
          </div>

          {selectedGame.id === "science-quiz" ? (
            <div className="science-config-row science-config-row--duel">
              <label className="label" htmlFor="science-category-select">
                Kategoria
              </label>
              <select
                id="science-category-select"
                className="input input--duel"
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

          <div className="duel-stage__action-row">
            <button
              className="btn btn--ghost btn--duel-secondary"
              type="button"
              disabled={activeElsewhere}
              onClick={() => onReadyChange(selectedGame.id, !ready[meRole])}
              data-testid={`ready-${selectedGame.id}`}
            >
              {ready[meRole] ? "COFNIJ GOTOWOŚĆ" : "GOTOWY"}
            </button>

            <button
              className="btn btn--duel"
              type="button"
              disabled={!canStart}
              onClick={() => onStart(toStartPayload(selectedGame.id, selectedCategory))}
              data-testid={`start-${selectedGame.id}`}
            >
              {thisGameActive ? "WZNÓW GRĘ" : "START GRY"}
            </button>
          </div>
        </div>
      </section>

      <div className="duel-library">
        {gamesRegistry.map((game, index) => {
          const catalog = getGameCatalogItem(game.id);
          const readyCount = Number(state.readyByGame[game.id].Sami) + Number(state.readyByGame[game.id].Patryk);
          const gameIsActive = state.activeGameId === game.id;
          const isSelected = selectedGame.id === game.id;

          return (
            <button
              key={game.id}
              type="button"
              className={`duel-library-card ${isSelected ? "is-selected" : ""} ${gameIsActive ? "is-live" : ""}`}
              onClick={() => setSelectedGameId(game.id)}
              data-testid={`game-row-${game.id}`}
              style={{ ["--card-delay" as string]: `${index * 60}ms` }}
            >
              <div className="duel-library-card__thumb">
                {catalog.revealIllustration ? (
                  <img src={catalog.revealIllustration} alt="" aria-hidden="true" loading="lazy" />
                ) : (
                  <img src={catalog.iconPath} alt="" aria-hidden="true" loading="lazy" />
                )}
              </div>

              <div className="duel-library-card__body">
                <div className="duel-library-card__head">
                  <h4>{game.title}</h4>
                  <span className="status-pill">{gameIsActive ? "LIVE" : `${readyCount}/2`}</span>
                </div>
                <p>{game.description}</p>
                <div className="duel-library-card__footer">
                  <span>{gameIsActive ? "Trwa pojedynek" : "Wybierz i przejdź do startu"}</span>
                  <strong>{isSelected ? "AKTYWNA KARTA" : "WYBIERZ"}</strong>
                </div>
              </div>
            </button>
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
