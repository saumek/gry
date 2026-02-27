import type {
  GameScore,
  QuizCategory,
  Role,
  ScienceQuestionPrompt,
  ScienceQuizGameState,
  ScienceQuizRoundReveal
} from "../../lib/types";
import { ROLES } from "../../lib/types";

type ScienceInternalQuestion = ScienceQuestionPrompt & { correctIndex: number };

export type ScienceQuizInternalState = {
  gameId: "science-quiz";
  sessionId: number;
  phase: ScienceQuizGameState["phase"];
  ready: ScienceQuizGameState["ready"];
  totalRounds: number;
  roundIndex: number;
  category: QuizCategory;
  questions: ScienceInternalQuestion[];
  scores: GameScore;
  currentAnswers: Partial<Record<Role, number>>;
  reveal?: ScienceQuizRoundReveal;
  history: ScienceQuizRoundReveal[];
  rematchVotes: Set<Role>;
  winnerRole?: Role;
};

export function createScienceQuizState(
  sessionId: number,
  category: QuizCategory,
  questions: ScienceInternalQuestion[]
): ScienceQuizInternalState {
  return {
    gameId: "science-quiz",
    sessionId,
    phase: "in_round",
    ready: {
      Sami: true,
      Patryk: true
    },
    totalRounds: questions.length,
    roundIndex: 0,
    category,
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

export function submitScienceAnswer(
  state: ScienceQuizInternalState,
  role: Role,
  answerIndex: number
): { changed: boolean; roundReveal?: ScienceQuizRoundReveal } {
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

  const correctByRole = {
    Sami: answers.Sami === question.correctIndex,
    Patryk: answers.Patryk === question.correctIndex
  };

  if (correctByRole.Sami) {
    state.scores.Sami += 1;
  }

  if (correctByRole.Patryk) {
    state.scores.Patryk += 1;
  }

  const bothCorrect = correctByRole.Sami && correctByRole.Patryk;
  if (bothCorrect) {
    state.scores.Sami += 1;
    state.scores.Patryk += 1;
  }

  const reveal: ScienceQuizRoundReveal = {
    round: state.roundIndex + 1,
    question: {
      id: question.id,
      gameId: "science-quiz",
      category: question.category,
      text: question.text,
      options: question.options,
      source: question.source
    },
    answers,
    correctIndex: question.correctIndex,
    correctByRole,
    bothCorrect,
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

export function advanceScienceQuizState(
  state: ScienceQuizInternalState
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

export function toPublicScienceQuizState(state: ScienceQuizInternalState): ScienceQuizGameState {
  const current = state.questions[state.roundIndex];

  return {
    gameId: state.gameId,
    sessionId: state.sessionId,
    phase: state.phase,
    ready: state.ready,
    totalRounds: state.totalRounds,
    round: state.roundIndex + 1,
    category: state.category,
    scores: {
      Sami: state.scores.Sami,
      Patryk: state.scores.Patryk
    },
    submittedRoles: ROLES.filter((role) => typeof state.currentAnswers[role] === "number"),
    currentQuestion: current
      ? {
          id: current.id,
          gameId: "science-quiz",
          category: current.category,
          text: current.text,
          options: current.options,
          source: current.source
        }
      : undefined,
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
