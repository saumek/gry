import type {
  BattleshipGameState,
  BattleshipShotPublic,
  BattleshipShotResult,
  Coord,
  GameScore,
  Role,
  ShipPlacement
} from "../../lib/types";
import { ROLES } from "../../lib/types";

type RoleBoardState = {
  placements: ShipPlacement[];
  ships: Coord[][];
  occupied: Set<string>;
  hitsTaken: Set<string>;
  setupDone: boolean;
};

export type BattleshipInternalState = {
  gameId: "mini-battleship";
  sessionId: number;
  phase: BattleshipGameState["phase"];
  ready: BattleshipGameState["ready"];
  boardSize: number;
  shipLengths: number[];
  boards: Record<Role, RoleBoardState>;
  shotsByRole: Record<Role, BattleshipShotPublic[]>;
  history: Array<BattleshipShotPublic & { shooter: Role }>;
  turnRole?: Role;
  winnerRole?: Role;
  rematchVotes: Set<Role>;
  scores: GameScore;
};

function emptyBoard(): RoleBoardState {
  return {
    placements: [],
    ships: [],
    occupied: new Set(),
    hitsTaken: new Set(),
    setupDone: false
  };
}

export function createBattleshipState(sessionId: number): BattleshipInternalState {
  return {
    gameId: "mini-battleship",
    sessionId,
    phase: "setup",
    ready: {
      Sami: true,
      Patryk: true
    },
    boardSize: 5,
    shipLengths: [3, 2, 2],
    boards: {
      Sami: emptyBoard(),
      Patryk: emptyBoard()
    },
    shotsByRole: {
      Sami: [],
      Patryk: []
    },
    history: [],
    rematchVotes: new Set(),
    scores: {
      Sami: 0,
      Patryk: 0
    }
  };
}

export function placeShips(
  state: BattleshipInternalState,
  role: Role,
  placements: ShipPlacement[]
): { changed: boolean; message?: string } {
  if (state.phase !== "setup") {
    return { changed: false, message: "Setup statków już się zakończył." };
  }

  const validated = validatePlacements(placements, state.boardSize, state.shipLengths);
  if (!validated.valid || !validated.ships) {
    return { changed: false, message: validated.message ?? "Niepoprawne ustawienie statków." };
  }

  const occupied = new Set<string>();
  for (const coord of validated.ships.flat()) {
    occupied.add(key(coord.x, coord.y));
  }

  state.boards[role] = {
    placements,
    ships: validated.ships,
    occupied,
    hitsTaken: new Set(),
    setupDone: true
  };

  if (state.boards.Sami.setupDone && state.boards.Patryk.setupDone) {
    state.phase = "in_round";
    state.turnRole = Math.random() > 0.5 ? "Sami" : "Patryk";
  }

  return { changed: true };
}

export function fireShot(
  state: BattleshipInternalState,
  role: Role,
  x: number,
  y: number
): { changed: boolean; result?: BattleshipShotResult; message?: string } {
  if (state.phase !== "in_round") {
    return { changed: false, message: "Gra nie jest w fazie strzałów." };
  }

  if (state.turnRole !== role) {
    return { changed: false, message: "To nie Twoja tura." };
  }

  if (!inBounds(x, y, state.boardSize)) {
    return { changed: false, message: "Pole jest poza planszą." };
  }

  const alreadyShot = state.shotsByRole[role].some((shot) => shot.x === x && shot.y === y);
  if (alreadyShot) {
    return { changed: false, message: "To pole zostało już ostrzelane." };
  }

  const targetRole = role === "Sami" ? "Patryk" : "Sami";
  const target = state.boards[targetRole];
  const targetKey = key(x, y);

  let result: BattleshipShotResult = "miss";
  if (target.occupied.has(targetKey)) {
    target.hitsTaken.add(targetKey);
    result = isShipSunk(target.ships, target.hitsTaken, x, y) ? "sunk" : "hit";
    state.scores[role] += 1;
  }

  const shot: BattleshipShotPublic = { x, y, result };
  state.shotsByRole[role].push(shot);
  state.history.push({ ...shot, shooter: role });

  if (target.hitsTaken.size >= target.occupied.size) {
    state.phase = "finished";
    state.winnerRole = role;
    state.turnRole = undefined;
  } else {
    state.turnRole = targetRole;
  }

  return { changed: true, result };
}

export function toPublicBattleshipState(
  state: BattleshipInternalState,
  role: Role
): BattleshipGameState {
  const opponent = role === "Sami" ? "Patryk" : "Sami";
  const myBoard = state.boards[role];

  return {
    gameId: state.gameId,
    sessionId: state.sessionId,
    phase: state.phase,
    ready: state.ready,
    boardSize: state.boardSize,
    shipLengths: state.shipLengths,
    setupDone: {
      Sami: state.boards.Sami.setupDone,
      Patryk: state.boards.Patryk.setupDone
    },
    turnRole: state.turnRole,
    winnerRole: state.winnerRole,
    myShips: myBoard.ships.flat(),
    myShots: state.shotsByRole[role],
    enemyShots: state.shotsByRole[opponent],
    history: state.history,
    rematchVotes: Array.from(state.rematchVotes),
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    }
  };
}

function validatePlacements(
  placements: ShipPlacement[],
  boardSize: number,
  requiredLengths: number[]
): { valid: boolean; ships?: Coord[][]; message?: string } {
  if (placements.length !== requiredLengths.length) {
    return { valid: false, message: "Wymagane są dokładnie 3 statki." };
  }

  const lengths = placements.map((entry) => entry.length).sort((a, b) => a - b);
  const required = [...requiredLengths].sort((a, b) => a - b);

  if (JSON.stringify(lengths) !== JSON.stringify(required)) {
    return { valid: false, message: "Długości statków muszą wynosić 3,2,2." };
  }

  const occupied = new Set<string>();
  const ships: Coord[][] = [];

  for (const placement of placements) {
    const coords: Coord[] = [];
    for (let i = 0; i < placement.length; i += 1) {
      const x = placement.orientation === "H" ? placement.x + i : placement.x;
      const y = placement.orientation === "V" ? placement.y + i : placement.y;

      if (!inBounds(x, y, boardSize)) {
        return { valid: false, message: "Statek wychodzi poza planszę." };
      }

      const cellKey = key(x, y);
      if (occupied.has(cellKey)) {
        return { valid: false, message: "Statki nie mogą się nakładać." };
      }

      occupied.add(cellKey);
      coords.push({ x, y });
    }

    ships.push(coords);
  }

  return { valid: true, ships };
}

function inBounds(x: number, y: number, size: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function key(x: number, y: number): string {
  return `${x}:${y}`;
}

function isShipSunk(ships: Coord[][], hits: Set<string>, x: number, y: number): boolean {
  const target = ships.find((ship) => ship.some((coord) => coord.x === x && coord.y === y));
  if (!target) {
    return false;
  }

  return target.every((coord) => hits.has(key(coord.x, coord.y)));
}
