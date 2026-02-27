"use client";

import { useMemo, useState } from "react";

import { winnerBadge } from "../lib/score-visuals";
import { phaseShortLabel } from "../lib/ui-state";
import type {
  BattleshipGameState,
  GameActionPayload,
  ShipOrientation,
  ShipPlacement
} from "../lib/types";
import { ResultChip } from "./result-chip";
import { RoundResultStrip } from "./round-result-strip";
import { Scoreboard } from "./scoreboard";

type BattleshipGameProps = {
  state: BattleshipGameState;
  meRole: "Sami" | "Patryk";
  onAction: (payload: GameActionPayload) => void;
};

const SHIP_LENGTHS = [3, 2, 2];

export function BattleshipGame({ state, meRole, onAction }: BattleshipGameProps) {
  const [orientation, setOrientation] = useState<ShipOrientation>("H");
  const [placements, setPlacements] = useState<ShipPlacement[]>([]);

  const mySetupDone = state.setupDone[meRole];
  const myTurn = state.turnRole === meRole;

  const enemyShotMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const shot of state.enemyShots) {
      map.set(`${shot.x}:${shot.y}`, shot.result);
    }
    return map;
  }, [state.enemyShots]);

  const myShotMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const shot of state.myShots) {
      map.set(`${shot.x}:${shot.y}`, shot.result);
    }
    return map;
  }, [state.myShots]);

  const previewShipCells = useMemo(() => {
    const map = new Set<string>();
    for (const placement of placements) {
      for (let i = 0; i < placement.length; i += 1) {
        const x = placement.orientation === "H" ? placement.x + i : placement.x;
        const y = placement.orientation === "V" ? placement.y + i : placement.y;
        map.add(`${x}:${y}`);
      }
    }
    return map;
  }, [placements]);

  const latestShot = state.history[state.history.length - 1];

  const placeNextShip = (x: number, y: number) => {
    const length = SHIP_LENGTHS[placements.length];
    if (!length) {
      return;
    }

    const next: ShipPlacement = {
      x,
      y,
      length,
      orientation
    };

    for (let i = 0; i < length; i += 1) {
      const cellX = orientation === "H" ? x + i : x;
      const cellY = orientation === "V" ? y + i : y;
      if (cellX < 0 || cellY < 0 || cellX >= state.boardSize || cellY >= state.boardSize) {
        return;
      }

      const key = `${cellX}:${cellY}`;
      if (previewShipCells.has(key)) {
        return;
      }
    }

    setPlacements((prev) => [...prev, next]);
  };

  const randomize = () => {
    const generated: ShipPlacement[] = [];

    for (const length of SHIP_LENGTHS) {
      let created = false;
      for (let attempt = 0; attempt < 200 && !created; attempt += 1) {
        const orientationPick: ShipOrientation = Math.random() > 0.5 ? "H" : "V";
        const maxX = orientationPick === "H" ? state.boardSize - length : state.boardSize - 1;
        const maxY = orientationPick === "V" ? state.boardSize - length : state.boardSize - 1;
        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));

        const candidate: ShipPlacement = { x, y, length, orientation: orientationPick };

        const occupied = new Set<string>();
        for (const item of generated) {
          for (let i = 0; i < item.length; i += 1) {
            const ox = item.orientation === "H" ? item.x + i : item.x;
            const oy = item.orientation === "V" ? item.y + i : item.y;
            occupied.add(`${ox}:${oy}`);
          }
        }

        let overlaps = false;
        for (let i = 0; i < candidate.length; i += 1) {
          const cx = candidate.orientation === "H" ? candidate.x + i : candidate.x;
          const cy = candidate.orientation === "V" ? candidate.y + i : candidate.y;
          if (occupied.has(`${cx}:${cy}`)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          generated.push(candidate);
          created = true;
        }
      }
    }

    if (generated.length === SHIP_LENGTHS.length) {
      setPlacements(generated);
    }
  };

  return (
    <section className="stack-lg" data-testid="battleship-game">
      <Scoreboard scores={state.scores} meRole={meRole} subtitle="Punkty za trafienia" />

      <section className="section-block">
        <div className="section-header">
          <h2>Przebieg bitwy</h2>
          <span className="chip">{phaseShortLabel(state.phase)}</span>
        </div>

        {state.phase === "setup" ? (
          <div className="stack motion-fade-up">
            <div className="result-chip-row">
              <ResultChip
                tone={mySetupDone ? "success" : "warning"}
                icon={mySetupDone ? "✓" : "•"}
                label={mySetupDone ? "Twoja plansza gotowa" : "Ustaw statki 3,2,2"}
              />
              <ResultChip
                tone={state.setupDone.Sami && state.setupDone.Patryk ? "success" : "info"}
                icon={state.setupDone.Sami && state.setupDone.Patryk ? "✓" : "•"}
                label={state.setupDone.Sami && state.setupDone.Patryk ? "Obie plansze gotowe" : "Czekamy na obie osoby"}
              />
            </div>

            {!mySetupDone ? (
              <>
                <div className="row-actions">
                  <button
                    className="btn btn--ghost btn--small"
                    type="button"
                    onClick={() => setOrientation((prev) => (prev === "H" ? "V" : "H"))}
                  >
                    Orientacja: {orientation}
                  </button>
                  <button className="btn btn--ghost btn--small" type="button" onClick={randomize}>
                    Losowe ustawienie
                  </button>
                  <button
                    className="btn btn--ghost btn--small"
                    type="button"
                    onClick={() => setPlacements((prev) => prev.slice(0, -1))}
                  >
                    Cofnij
                  </button>
                </div>

                <BoardGrid
                  size={state.boardSize}
                  mode="setup"
                  shipCells={previewShipCells}
                  onCellClick={placeNextShip}
                />

                <button
                  className="btn"
                  type="button"
                  disabled={placements.length !== SHIP_LENGTHS.length}
                  onClick={() =>
                    onAction({
                      gameId: "mini-battleship",
                      type: "place_ships",
                      placements
                    })
                  }
                >
                  Zatwierdź ustawienie
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {state.phase === "in_round" ? (
          <div className="stack motion-fade-up">
            <div className="result-chip-row">
              <ResultChip
                tone={myTurn ? "success" : "info"}
                icon={myTurn ? "✓" : "•"}
                label={myTurn ? "Twoja tura" : "Tura przeciwnika"}
              />

              {latestShot ? (
                <ResultChip
                  tone={latestShot.result === "miss" ? "neutral" : "danger"}
                  icon={latestShot.result === "miss" ? "◦" : "✕"}
                  label={`Ostatni strzał ${latestShot.shooter}: ${latestShot.result}`}
                />
              ) : (
                <ResultChip tone="info" icon="•" label="Brak oddanych strzałów" />
              )}
            </div>

            <div className="board-pair">
              <section className="board-section">
                <h3>Twoja plansza</h3>
                <BoardGrid
                  size={state.boardSize}
                  mode="own"
                  shipCells={new Set(state.myShips.map((coord) => `${coord.x}:${coord.y}`))}
                  enemyShotMap={enemyShotMap}
                />
              </section>
              <section className="board-section">
                <h3>Plansza przeciwnika</h3>
                <BoardGrid
                  size={state.boardSize}
                  mode="target"
                  myShotMap={myShotMap}
                  onCellClick={(x, y) => {
                    if (!myTurn) {
                      return;
                    }

                    onAction({
                      gameId: "mini-battleship",
                      type: "fire",
                      x,
                      y
                    });
                  }}
                />
              </section>
            </div>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="stack motion-fade-up" id="game-result-section" data-testid="game-result-section">
            <RoundResultStrip
              title="Koniec gry"
              description="Bitwa zakończona"
              badges={[winnerBadge(state.scores, state.winnerRole)]}
            />

            <div className="result-actions">
              <button
                className="btn"
                type="button"
                onClick={() => onAction({ gameId: "mini-battleship", type: "rematch" })}
              >
                Rewanż
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => onAction({ gameId: "mini-battleship", type: "return_lobby" })}
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

type BoardGridProps = {
  size: number;
  mode: "setup" | "own" | "target";
  shipCells?: Set<string>;
  enemyShotMap?: Map<string, string>;
  myShotMap?: Map<string, string>;
  onCellClick?: (x: number, y: number) => void;
};

function BoardGrid({
  size,
  mode,
  shipCells = new Set(),
  enemyShotMap = new Map(),
  myShotMap = new Map(),
  onCellClick
}: BoardGridProps) {
  return (
    <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {Array.from({ length: size * size }, (_, index) => {
        const x = index % size;
        const y = Math.floor(index / size);
        const key = `${x}:${y}`;

        const mine = shipCells.has(key);
        const enemyShot = enemyShotMap.get(key);
        const myShot = myShotMap.get(key);

        const classes = ["board-cell"];
        let marker = "";

        if (mode !== "target" && mine) {
          classes.push("is-ship");
        }

        if (enemyShot) {
          classes.push(enemyShot === "miss" ? "is-miss" : "is-hit");
          marker = enemyShot === "miss" ? "o" : "x";
        }

        if (myShot) {
          classes.push(myShot === "miss" ? "is-miss" : "is-hit");
          marker = myShot === "miss" ? "o" : "x";
        }

        return (
          <button
            key={key}
            className={classes.join(" ")}
            type="button"
            onClick={() => onCellClick?.(x, y)}
            data-testid={`board-${mode}-${x}-${y}`}
          >
            {marker}
          </button>
        );
      })}
    </div>
  );
}
