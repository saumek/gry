import type {
  Coord,
  FireWaterCoopState,
  FireWaterDirection,
  FireWaterMoveHistory,
  FireWaterMoveResult,
  FireWaterTile,
  Role
} from "../../lib/types";

type InternalBoard = FireWaterTile[][];

export type FireWaterInternalState = {
  gameId: "fire-water-coop";
  sessionId: number;
  phase: FireWaterCoopState["phase"];
  ready: FireWaterCoopState["ready"];
  boardSize: number;
  board: InternalBoard;
  positions: Record<Role, Coord>;
  turnRole?: Role;
  movesUsed: number;
  movesLimit: number;
  keysCollected: Record<Role, boolean>;
  scores: FireWaterCoopState["scores"];
  history: FireWaterMoveHistory[];
  rematchVotes: Set<Role>;
  winnerRole?: Role;
  outcome?: "win" | "loss";
};

const BASE_BOARD: InternalBoard = [
  ["empty", "wall", "empty", "key_water", "empty"],
  ["empty", "water", "empty", "wall", "empty"],
  ["key_fire", "empty", "lava", "empty", "exit"],
  ["empty", "wall", "empty", "water", "empty"],
  ["empty", "empty", "empty", "wall", "empty"]
];

const START_POSITIONS: Record<Role, Coord> = {
  Sami: { x: 0, y: 4 },
  Patryk: { x: 4, y: 0 }
};

export function createFireWaterState(sessionId: number): FireWaterInternalState {
  return {
    gameId: "fire-water-coop",
    sessionId,
    phase: "in_round",
    ready: {
      Sami: true,
      Patryk: true
    },
    boardSize: 5,
    board: BASE_BOARD.map((row) => [...row]),
    positions: {
      Sami: { ...START_POSITIONS.Sami },
      Patryk: { ...START_POSITIONS.Patryk }
    },
    turnRole: Math.random() > 0.5 ? "Sami" : "Patryk",
    movesUsed: 0,
    movesLimit: 24,
    keysCollected: {
      Sami: false,
      Patryk: false
    },
    scores: {
      Sami: 0,
      Patryk: 0
    },
    history: [],
    rematchVotes: new Set()
  };
}

export function moveFireWater(
  state: FireWaterInternalState,
  role: Role,
  direction: FireWaterDirection
): { changed: boolean; result?: FireWaterMoveResult; message?: string } {
  if (state.phase !== "in_round") {
    return { changed: false, message: "Gra kooperacyjna jest już zakończona." };
  }

  if (state.turnRole !== role) {
    return { changed: false, message: "To nie Twoja tura." };
  }

  const from = state.positions[role];
  const delta = directionToDelta(direction);
  const attempted = {
    x: from.x + delta.x,
    y: from.y + delta.y
  };

  let result: FireWaterMoveResult = "moved";
  let moved = false;

  if (!inBounds(attempted.x, attempted.y, state.boardSize)) {
    result = "blocked";
  } else {
    const tile = state.board[attempted.y][attempted.x];

    if (tile === "wall") {
      result = "blocked";
    } else if (role === "Sami" && tile === "water") {
      result = "hazard_blocked";
    } else if (role === "Patryk" && tile === "lava") {
      result = "hazard_blocked";
    } else {
      moved = true;
      state.positions[role] = attempted;

      if (tile === "key_fire" && role === "Sami" && !state.keysCollected.Sami) {
        state.keysCollected.Sami = true;
        state.board[attempted.y][attempted.x] = "empty";
        result = "collected_key";
      } else if (tile === "key_water" && role === "Patryk" && !state.keysCollected.Patryk) {
        state.keysCollected.Patryk = true;
        state.board[attempted.y][attempted.x] = "empty";
        result = "collected_key";
      } else if (tile === "exit") {
        if (hasCoopWin(state)) {
          result = "win";
          state.phase = "finished";
          state.outcome = "win";
          state.turnRole = undefined;
        } else {
          result = "exit_wait";
        }
      }
    }
  }

  state.movesUsed += 1;

  const historyItem: FireWaterMoveHistory = {
    turn: state.movesUsed,
    role,
    direction,
    to: moved ? state.positions[role] : from,
    result
  };
  state.history.push(historyItem);

  if (state.phase !== "finished" && state.movesUsed >= state.movesLimit) {
    result = "loss";
    state.phase = "finished";
    state.outcome = "loss";
    state.turnRole = undefined;
    state.history[state.history.length - 1] = {
      ...historyItem,
      result: "loss"
    };
  }

  updateCoopScores(state);

  if (state.phase !== "finished") {
    state.turnRole = role === "Sami" ? "Patryk" : "Sami";
  }

  return {
    changed: true,
    result
  };
}

export function toPublicFireWaterState(state: FireWaterInternalState): FireWaterCoopState {
  return {
    gameId: state.gameId,
    sessionId: state.sessionId,
    phase: state.phase,
    ready: state.ready,
    boardSize: state.boardSize,
    board: state.board.map((row) => [...row]),
    positions: {
      Sami: { ...state.positions.Sami },
      Patryk: { ...state.positions.Patryk }
    },
    turnRole: state.turnRole,
    movesUsed: state.movesUsed,
    movesLimit: state.movesLimit,
    keysCollected: {
      Sami: state.keysCollected.Sami,
      Patryk: state.keysCollected.Patryk
    },
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    },
    history: state.history,
    rematchVotes: Array.from(state.rematchVotes),
    winnerRole: state.winnerRole,
    outcome: state.outcome
  };
}

function directionToDelta(direction: FireWaterDirection): Coord {
  if (direction === "up") {
    return { x: 0, y: -1 };
  }

  if (direction === "down") {
    return { x: 0, y: 1 };
  }

  if (direction === "left") {
    return { x: -1, y: 0 };
  }

  return { x: 1, y: 0 };
}

function inBounds(x: number, y: number, size: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function hasCoopWin(state: FireWaterInternalState): boolean {
  if (!state.keysCollected.Sami || !state.keysCollected.Patryk) {
    return false;
  }

  const exit = findExit(state.board);
  if (!exit) {
    return false;
  }

  return (
    state.positions.Sami.x === exit.x &&
    state.positions.Sami.y === exit.y &&
    state.positions.Patryk.x === exit.x &&
    state.positions.Patryk.y === exit.y
  );
}

function findExit(board: InternalBoard): Coord | undefined {
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === "exit") {
        return { x, y };
      }
    }
  }

  return undefined;
}

function updateCoopScores(state: FireWaterInternalState): void {
  const exit = findExit(state.board);
  const onExitSami = exit
    ? state.positions.Sami.x === exit.x && state.positions.Sami.y === exit.y
    : false;
  const onExitPatryk = exit
    ? state.positions.Patryk.x === exit.x && state.positions.Patryk.y === exit.y
    : false;

  let progress = 0;
  progress += Number(state.keysCollected.Sami);
  progress += Number(state.keysCollected.Patryk);
  progress += Number(onExitSami);
  progress += Number(onExitPatryk);

  if (state.outcome === "win") {
    progress += 2;
  }

  state.scores.Sami = progress;
  state.scores.Patryk = progress;
}
