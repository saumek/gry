import type {
  GameScore,
  QaGameState,
  QaRoundReveal,
  QuestionCard,
  Role
} from "../../lib/types";
import { ROLES } from "../../lib/types";

export type QaInternalState = {
  gameId: "qa-lightning";
  sessionId: number;
  phase: QaGameState["phase"];
  ready: QaGameState["ready"];
  totalRounds: number;
  roundIndex: number;
  questions: QuestionCard[];
  scores: GameScore;
  currentAnswers: Partial<Record<Role, number>>;
  reveal?: QaRoundReveal;
  history: QaRoundReveal[];
  rematchVotes: Set<Role>;
  winnerRole?: Role;
};

export function createQaState(sessionId: number, questions: QuestionCard[]): QaInternalState {
  return {
    gameId: "qa-lightning",
    sessionId,
    phase: "in_round",
    ready: {
      Sami: true,
      Patryk: true
    },
    totalRounds: questions.length,
    roundIndex: 0,
    questions,
    scores: {
      Sami: 0,
      Patryk: 0
    },
    currentAnswers: {},
    history: [],
    rematchVotes: new Set()
  };
}

export function submitQaAnswer(
  state: QaInternalState,
  role: Role,
  answerIndex: number
): { changed: boolean; roundReveal?: QaRoundReveal } {
  if (state.phase !== "in_round") {
    return { changed: false };
  }

  if (answerIndex < 0 || answerIndex > 3) {
    return { changed: false };
  }

  if (typeof state.currentAnswers[role] === "number") {
    return { changed: false };
  }

  state.currentAnswers[role] = answerIndex;

  if (!hasBoth(state.currentAnswers)) {
    return { changed: true };
  }

  const question = state.questions[state.roundIndex];
  const answers = {
    Sami: state.currentAnswers.Sami as number,
    Patryk: state.currentAnswers.Patryk as number
  };
  const matched = answers.Sami === answers.Patryk;
  if (matched) {
    state.scores.Sami += 1;
    state.scores.Patryk += 1;
  }

  const reveal: QaRoundReveal = {
    round: state.roundIndex + 1,
    question,
    answers,
    matched,
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    }
  };

  state.reveal = reveal;
  state.history.push(reveal);
  state.phase = "reveal";

  return { changed: true, roundReveal: reveal };
}

export function advanceQaState(state: QaInternalState): { changed: boolean; finished: boolean } {
  if (state.phase !== "reveal") {
    return { changed: false, finished: false };
  }

  if (state.roundIndex >= state.totalRounds - 1) {
    state.phase = "finished";
    state.winnerRole = resolveWinner(state.scores);
    return { changed: true, finished: true };
  }

  state.roundIndex += 1;
  state.currentAnswers = {};
  state.reveal = undefined;
  state.phase = "in_round";
  return { changed: true, finished: false };
}

export function toPublicQaState(state: QaInternalState): QaGameState {
  return {
    gameId: state.gameId,
    sessionId: state.sessionId,
    phase: state.phase,
    ready: state.ready,
    totalRounds: state.totalRounds,
    round: state.roundIndex + 1,
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    },
    submittedRoles: ROLES.filter((role) => typeof state.currentAnswers[role] === "number"),
    currentQuestion: state.questions[state.roundIndex],
    reveal: state.reveal,
    history: state.history,
    rematchVotes: Array.from(state.rematchVotes),
    winnerRole: state.winnerRole
  };
}

function hasBoth(value: Partial<Record<Role, number>>): value is Record<Role, number> {
  return typeof value.Sami === "number" && typeof value.Patryk === "number";
}

function resolveWinner(scores: GameScore): Role | undefined {
  if (scores.Sami === scores.Patryk) {
    return undefined;
  }

  return scores.Sami > scores.Patryk ? "Sami" : "Patryk";
}
