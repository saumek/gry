export const ROLES = ["Sami", "Patryk"] as const;

export type Role = (typeof ROLES)[number];

export type PresenceState = {
  online: Record<Role, boolean>;
  occupiedRoles: Role[];
};

export type AuthJoinPayload = {
  pin: string;
  deviceId: string;
  desiredRole?: Role;
};

export type AuthStatePayload = {
  ok: boolean;
  meRole?: Role;
  requiresChoice: boolean;
  availableRoles: Role[];
  roomFull: boolean;
};

export type GameId = "qa-lightning" | "better-half" | "mini-battleship";

export type GamePhase =
  | "idle"
  | "ready"
  | "setup"
  | "in_round"
  | "reveal"
  | "finished";

export type QuestionSource = "builtin" | "custom";

export type QuestionCard = {
  id: number;
  gameId: Extract<GameId, "qa-lightning" | "better-half">;
  text: string;
  options: [string, string, string, string];
  source: QuestionSource;
  authorRole?: Role;
};

export type GameScore = Record<Role, number>;
export type GameEndReason = "normal" | "aborted";

export type EndRequest = {
  requestedBy: Role;
  approvals: Role[];
  expiresAt: string;
};

export type GameStatus = "w_przygotowaniu" | "beta" | "aktywna";

export type GameDefinition = {
  id: GameId;
  title: string;
  description: string;
  status: GameStatus;
  eta?: string;
};

export type QaRoundReveal = {
  round: number;
  question: QuestionCard;
  answers: Record<Role, number>;
  matched: boolean;
  scores: GameScore;
};

export type BetterHalfRoundReveal = {
  round: number;
  question: QuestionCard;
  answers: Record<Role, { selfAnswer: number; guessPartner: number }>;
  hits: Record<Role, boolean>;
  scores: GameScore;
};

export type Coord = {
  x: number;
  y: number;
};

export type ShipOrientation = "H" | "V";

export type ShipPlacement = {
  x: number;
  y: number;
  length: number;
  orientation: ShipOrientation;
};

export type BattleshipShotResult = "hit" | "miss" | "sunk";

export type BattleshipShotPublic = {
  x: number;
  y: number;
  result: BattleshipShotResult;
};

export type QaGameState = {
  gameId: "qa-lightning";
  sessionId: number;
  phase: GamePhase;
  ready: Record<Role, boolean>;
  totalRounds: number;
  round: number;
  scores: GameScore;
  submittedRoles: Role[];
  currentQuestion?: QuestionCard;
  reveal?: QaRoundReveal;
  history: QaRoundReveal[];
  rematchVotes: Role[];
  winnerRole?: Role;
  endRequest?: EndRequest;
};

export type BetterHalfGameState = {
  gameId: "better-half";
  sessionId: number;
  phase: GamePhase;
  ready: Record<Role, boolean>;
  totalRounds: number;
  round: number;
  scores: GameScore;
  submittedRoles: Role[];
  currentQuestion?: QuestionCard;
  reveal?: BetterHalfRoundReveal;
  history: BetterHalfRoundReveal[];
  rematchVotes: Role[];
  winnerRole?: Role;
  endRequest?: EndRequest;
};

export type BattleshipGameState = {
  gameId: "mini-battleship";
  sessionId: number;
  phase: GamePhase;
  ready: Record<Role, boolean>;
  boardSize: number;
  shipLengths: number[];
  setupDone: Record<Role, boolean>;
  turnRole?: Role;
  winnerRole?: Role;
  myShips: Coord[];
  myShots: BattleshipShotPublic[];
  enemyShots: BattleshipShotPublic[];
  history: Array<BattleshipShotPublic & { shooter: Role }>;
  rematchVotes: Role[];
  scores: GameScore;
  endRequest?: EndRequest;
};

export type ActiveGameState = QaGameState | BetterHalfGameState | BattleshipGameState;

export type GameHistoryEntry = {
  sessionId: number;
  gameId: GameId;
  status: string;
  winnerRole?: Role;
  scores: GameScore;
  startedAt: string;
  finishedAt?: string;
};

export type GameStatusPayload = {
  activeGameId: GameId | null;
  readyByGame: Record<GameId, Record<Role, boolean>>;
  activeGame: ActiveGameState | null;
  latestResult: GameResultPayload | null;
  history: GameHistoryEntry[];
};

export type GameResultPayload = {
  gameId: GameId;
  sessionId: number;
  winnerRole?: Role;
  scores: GameScore;
  summary: string;
  endReason: GameEndReason;
};

export type GameResumePayload = {
  state: GameStatusPayload;
};

export type SessionConfigPayload = {
  heartbeatIntervalMs: number;
  sessionTtlMs: number;
};

export type GameReadyPayload = {
  gameId: GameId;
  ready: boolean;
};

export type GameStartPayload = {
  gameId: GameId;
};

export type QuestionAddPayload = {
  gameId: Extract<GameId, "qa-lightning" | "better-half">;
  text: string;
  options: [string, string, string, string];
};

export type QaSubmitPayload = {
  gameId: "qa-lightning";
  type: "submit";
  answerIndex: number;
};

export type BetterHalfSubmitPayload = {
  gameId: "better-half";
  type: "submit";
  selfAnswerIndex: number;
  guessPartnerIndex: number;
};

export type BattleshipPlaceShipsPayload = {
  gameId: "mini-battleship";
  type: "place_ships";
  placements: ShipPlacement[];
};

export type BattleshipFirePayload = {
  gameId: "mini-battleship";
  type: "fire";
  x: number;
  y: number;
};

export type AdvancePayload = {
  gameId: GameId;
  type: "advance";
};

export type RematchPayload = {
  gameId: GameId;
  type: "rematch";
};

export type ReturnLobbyPayload = {
  gameId: GameId;
  type: "return_lobby";
};

export type GameRequestEndPayload = {
  gameId: GameId;
  type: "request_end";
};

export type GameApproveEndPayload = {
  gameId: GameId;
  type: "approve_end";
};

export type GameRejectEndPayload = {
  gameId: GameId;
  type: "reject_end";
};

export type GameActionPayload =
  | QaSubmitPayload
  | BetterHalfSubmitPayload
  | BattleshipPlaceShipsPayload
  | BattleshipFirePayload
  | AdvancePayload
  | RematchPayload
  | ReturnLobbyPayload
  | GameRequestEndPayload
  | GameApproveEndPayload
  | GameRejectEndPayload;

export type GameEventPayload = {
  kind:
    | "ready_changed"
    | "game_started"
    | "round_revealed"
    | "round_advanced"
    | "ships_placed"
    | "shot"
    | "game_finished"
    | "game_aborted"
    | "end_requested"
    | "end_request_cancelled"
    | "returned_to_lobby"
    | "rematch_vote";
  gameId: GameId;
  message: string;
};

export type ResultTone = "success" | "danger" | "neutral" | "info" | "warning";

export type RoundBadgeModel = {
  label: string;
  tone: ResultTone;
  icon: string;
};

export type ScoreCardModel = {
  role: Role;
  points: number;
  delta: number;
  lead: boolean;
};

export type ThemeMode = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type ViewDensity = "compact";

export type AppTab = "game" | "lobby" | "history";

export type ConnectionStatus = "offline" | "connecting" | "online" | "reconnecting";

export type TopBarModel = {
  roleLabel: string;
  connectionStatus: ConnectionStatus;
  connectionLabel: string;
  gameLabel: string;
  phaseLabel?: string;
  scoreLabel?: string;
  jumpToResult: boolean;
};

export type NavItemModel = {
  id: AppTab;
  label: string;
  icon: string;
  badge?: number;
};
