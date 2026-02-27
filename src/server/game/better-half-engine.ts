import type {
  BetterHalfGameState,
  BetterHalfRoundReveal,
  GameScore,
  QuestionCard,
  Role
} from "../../lib/types";
import { ROLES } from "../../lib/types";

type AnswerPair = {
  selfAnswer: number;
  guessPartner: number;
};

export type BetterHalfInternalState = {
  gameId: "better-half";
  sessionId: number;
  phase: BetterHalfGameState["phase"];
  ready: BetterHalfGameState["ready"];
  totalRounds: number;
  roundIndex: number;
  questions: QuestionCard[];
  scores: GameScore;
  currentAnswers: Partial<Record<Role, AnswerPair>>;
  reveal?: BetterHalfRoundReveal;
  history: BetterHalfRoundReveal[];
  rematchVotes: Set<Role>;
  winnerRole?: Role;
};

export function createBetterHalfState(
  sessionId: number,
  questions: QuestionCard[]
): BetterHalfInternalState {
  return {
    gameId: "better-half",
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

export function submitBetterHalfAnswer(
  state: BetterHalfInternalState,
  role: Role,
  selfAnswer: number,
  guessPartner: number
): { changed: boolean; roundReveal?: BetterHalfRoundReveal } {
  if (state.phase !== "in_round") {
    return { changed: false };
  }

  if (selfAnswer < 0 || selfAnswer > 3 || guessPartner < 0 || guessPartner > 3) {
    return { changed: false };
  }

  if (state.currentAnswers[role]) {
    return { changed: false };
  }

  state.currentAnswers[role] = {
    selfAnswer,
    guessPartner
  };

  if (!hasBoth(state.currentAnswers)) {
    return { changed: true };
  }

  const answers = {
    Sami: state.currentAnswers.Sami as AnswerPair,
    Patryk: state.currentAnswers.Patryk as AnswerPair
  };

  const hits = {
    Sami: answers.Sami.guessPartner === answers.Patryk.selfAnswer,
    Patryk: answers.Patryk.guessPartner === answers.Sami.selfAnswer
  };

  if (hits.Sami) {
    state.scores.Sami += 1;
  }
  if (hits.Patryk) {
    state.scores.Patryk += 1;
  }

  const reveal: BetterHalfRoundReveal = {
    round: state.roundIndex + 1,
    question: state.questions[state.roundIndex],
    answers,
    hits,
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    }
  };

  state.reveal = reveal;
  state.history.push(reveal);
  state.phase = "reveal";

  return {
    changed: true,
    roundReveal: reveal
  };
}

export function advanceBetterHalfState(
  state: BetterHalfInternalState
): { changed: boolean; finished: boolean } {
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

export function toPublicBetterHalfState(
  state: BetterHalfInternalState
): BetterHalfGameState {
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
    submittedRoles: ROLES.filter((role) => Boolean(state.currentAnswers[role])),
    currentQuestion: state.questions[state.roundIndex],
    reveal: state.reveal,
    history: state.history,
    rematchVotes: Array.from(state.rematchVotes),
    winnerRole: state.winnerRole
  };
}

function hasBoth(
  value: Partial<Record<Role, AnswerPair>>
): value is Record<Role, AnswerPair> {
  return Boolean(value.Sami) && Boolean(value.Patryk);
}

function resolveWinner(scores: GameScore): Role | undefined {
  if (scores.Sami === scores.Patryk) {
    return undefined;
  }

  return scores.Sami > scores.Patryk ? "Sami" : "Patryk";
}
