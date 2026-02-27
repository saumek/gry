"use client";

import { phaseShortLabel } from "../lib/ui-state";
import type { FireWaterCoopState, FireWaterDirection, GameActionPayload, Role } from "../lib/types";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
import { Scoreboard } from "./scoreboard";

type FireWaterCoopGameProps = {
  state: FireWaterCoopState;
  meRole: Role;
  onAction: (payload: GameActionPayload) => void;
};

export function FireWaterCoopGame({ state, meRole, onAction }: FireWaterCoopGameProps) {
  const myTurn = state.turnRole === meRole;
  const movesLeft = Math.max(0, state.movesLimit - state.movesUsed);

  return (
    <section className="stack-lg" data-testid="fire-water-coop-game">
      <Scoreboard
        scores={state.scores}
        meRole={meRole}
        subtitle={`Ruchy ${state.movesUsed}/${state.movesLimit}`}
      />

      <section className="section-block">
        <div className="section-header">
          <h2>Ogień i Woda Co-op</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "in_round" ? (
          <div className="stack motion-fade-up">
            <div className="result-chip-row">
              <ResultChip
                tone={myTurn ? "success" : "info"}
                icon={myTurn ? "✓" : "•"}
                label={myTurn ? "Twoja tura" : `Tura: ${state.turnRole}`}
              />
              <ResultChip
                tone={movesLeft <= 6 ? "warning" : "info"}
                icon="•"
                label={`Pozostało ruchów: ${movesLeft}`}
              />
              <ResultChip
                tone={state.keysCollected.Sami && state.keysCollected.Patryk ? "success" : "warning"}
                icon={state.keysCollected.Sami && state.keysCollected.Patryk ? "✓" : "•"}
                label={`Klucze: ${Number(state.keysCollected.Sami) + Number(state.keysCollected.Patryk)}/2`}
              />
            </div>

            <section className="board-section">
              <h3>Plansza współpracy 5x5</h3>
              <CoopBoard
                state={state}
                activeRole={meRole}
                enabled={myTurn}
                onMove={(direction) =>
                  onAction({
                    gameId: "fire-water-coop",
                    type: "move",
                    direction
                  })
                }
              />
            </section>

            <div className="direction-pad" role="group" aria-label="Sterowanie ruchem">
              <button
                className="btn btn--ghost btn--small"
                type="button"
                disabled={!myTurn}
                onClick={() => onAction({ gameId: "fire-water-coop", type: "move", direction: "up" })}
              >
                ↑
              </button>
              <button
                className="btn btn--ghost btn--small"
                type="button"
                disabled={!myTurn}
                onClick={() => onAction({ gameId: "fire-water-coop", type: "move", direction: "left" })}
              >
                ←
              </button>
              <button
                className="btn btn--ghost btn--small"
                type="button"
                disabled={!myTurn}
                onClick={() => onAction({ gameId: "fire-water-coop", type: "move", direction: "down" })}
              >
                ↓
              </button>
              <button
                className="btn btn--ghost btn--small"
                type="button"
                disabled={!myTurn}
                onClick={() => onAction({ gameId: "fire-water-coop", type: "move", direction: "right" })}
              >
                →
              </button>
            </div>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="stack motion-fade-up" id="game-result-section" data-testid="game-result-section">
            <RoundResultStrip
              title={state.outcome === "win" ? "Poziom ukończony" : "Próba nieudana"}
              description={
                state.outcome === "win"
                  ? "Obie osoby zebrały klucze i dotarły do wyjścia"
                  : "Limit ruchów wyczerpany przed ukończeniem planszy"
              }
              badges={[
                {
                  icon: state.outcome === "win" ? "★" : "✕",
                  label: state.outcome === "win" ? "Ukończona współpraca" : "Nieudana współpraca",
                  tone: state.outcome === "win" ? "success" : "danger"
                }
              ]}
            />

            <div className="result-actions">
              <button
                className="btn"
                type="button"
                onClick={() => onAction({ gameId: "fire-water-coop", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "fire-water-coop", type: "return_lobby" })}
              >
                Powrót do lobby
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

type CoopBoardProps = {
  state: FireWaterCoopState;
  activeRole: Role;
  enabled: boolean;
  onMove: (direction: FireWaterDirection) => void;
};

function CoopBoard({ state, activeRole, enabled, onMove }: CoopBoardProps) {
  const myPosition = state.positions[activeRole];

  return (
    <div className="board-grid" style={{ gridTemplateColumns: `repeat(${state.boardSize}, 1fr)` }}>
      {state.board.flatMap((row, y) =>
        row.map((tile, x) => {
          const hasSami = state.positions.Sami.x === x && state.positions.Sami.y === y;
          const hasPatryk = state.positions.Patryk.x === x && state.positions.Patryk.y === y;
          const direction = directionFromTo(myPosition, { x, y });

          const classes = ["board-cell", "board-cell--coop", `tile-${tile}`];
          if (hasSami) {
            classes.push("has-sami");
          }
          if (hasPatryk) {
            classes.push("has-patryk");
          }

          return (
            <button
              key={`${x}:${y}`}
              className={classes.join(" ")}
              type="button"
              disabled={!enabled || !direction}
              onClick={() => {
                if (direction) {
                  onMove(direction);
                }
              }}
              data-testid={`fire-water-cell-${x}-${y}`}
            >
              {renderTile(tile, hasSami, hasPatryk)}
            </button>
          );
        })
      )}
    </div>
  );
}

function directionFromTo(from: { x: number; y: number }, to: { x: number; y: number }): FireWaterDirection | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === -1) {
    return "up";
  }

  if (dx === 0 && dy === 1) {
    return "down";
  }

  if (dx === -1 && dy === 0) {
    return "left";
  }

  if (dx === 1 && dy === 0) {
    return "right";
  }

  return null;
}

function renderTile(tile: FireWaterCoopState["board"][number][number], hasSami: boolean, hasPatryk: boolean): string {
  if (hasSami && hasPatryk) {
    return "FW";
  }

  if (hasSami) {
    return "F";
  }

  if (hasPatryk) {
    return "W";
  }

  if (tile === "wall") {
    return "■";
  }

  if (tile === "lava") {
    return "L";
  }

  if (tile === "water") {
    return "W";
  }

  if (tile === "key_fire") {
    return "Kf";
  }

  if (tile === "key_water") {
    return "Kw";
  }

  if (tile === "exit") {
    return "E";
  }

  return "";
}
