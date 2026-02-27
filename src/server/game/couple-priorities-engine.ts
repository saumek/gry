import type {
  CouplePrioritiesGameState,
  CouplePrioritiesRoundReveal,
  CouplePromptCard,
  GameScore,
  Role
} from "../../lib/types";
import { ROLES } from "../../lib/types";

type PrioritySubmission = {
  ranking: [number, number, number, number];
  guessPartnerTop: number;
};

export type CouplePrioritiesInternalState = {
  gameId: "couple-priorities";
  sessionId: number;
  phase: CouplePrioritiesGameState["phase"];
  ready: CouplePrioritiesGameState["ready"];
  totalRounds: number;
  roundIndex: number;
  prompts: CouplePromptCard[];
  scores: GameScore;
  currentSubmissions: Partial<Record<Role, PrioritySubmission>>;
  reveal?: CouplePrioritiesRoundReveal;
  history: CouplePrioritiesRoundReveal[];
  rematchVotes: Set<Role>;
  winnerRole?: Role;
};

export function createCouplePrioritiesState(
  sessionId: number,
  prompts: CouplePromptCard[]
): CouplePrioritiesInternalState {
  return {
    gameId: "couple-priorities",
    sessionId,
    phase: "in_round",
    ready: {
      Sami: true,
      Patryk: true
    },
    totalRounds: prompts.length,
    roundIndex: 0,
    prompts,
    scores: {
      Sami: 0,
      Patryk: 0
    },
    currentSubmissions: {},
    history: [],
    rematchVotes: new Set()
  };
}

export function submitCouplePriorities(
  state: CouplePrioritiesInternalState,
  role: Role,
  ranking: [number, number, number, number],
  guessPartnerTop: number
): { changed: boolean; roundReveal?: CouplePrioritiesRoundReveal } {
  if (state.phase !== "in_round") {
    return { changed: false };
  }

  if (!isValidRanking(ranking)) {
    return { changed: false };
  }

  if (guessPartnerTop < 0 || guessPartnerTop > 3) {
    return { changed: false };
  }

  if (state.currentSubmissions[role]) {
    return { changed: false };
  }

  state.currentSubmissions[role] = {
    ranking,
    guessPartnerTop
  };

  if (!hasBoth(state.currentSubmissions)) {
    return { changed: true };
  }

  const submissions = {
    Sami: state.currentSubmissions.Sami as PrioritySubmission,
    Patryk: state.currentSubmissions.Patryk as PrioritySubmission
  };

  let alignmentPoints = 0;
  for (let i = 0; i < 4; i += 1) {
    if (submissions.Sami.ranking[i] === submissions.Patryk.ranking[i]) {
      alignmentPoints += 1;
    }
  }

  const guessHits = {
    Sami: submissions.Sami.guessPartnerTop === submissions.Patryk.ranking[0],
    Patryk: submissions.Patryk.guessPartnerTop === submissions.Sami.ranking[0]
  };

  const roundPoints = {
    Sami: alignmentPoints + (guessHits.Sami ? 1 : 0),
    Patryk: alignmentPoints + (guessHits.Patryk ? 1 : 0)
  };

  state.scores.Sami += roundPoints.Sami;
  state.scores.Patryk += roundPoints.Patryk;

  const reveal: CouplePrioritiesRoundReveal = {
    round: state.roundIndex + 1,
    prompt: state.prompts[state.roundIndex],
    submissions,
    alignmentPoints,
    guessHits,
    roundPoints,
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

export function advanceCouplePrioritiesState(
  state: CouplePrioritiesInternalState
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
  state.currentSubmissions = {};
  state.reveal = undefined;
  state.phase = "in_round";

  return { changed: true, finished: false };
}

export function toPublicCouplePrioritiesState(
  state: CouplePrioritiesInternalState
): CouplePrioritiesGameState {
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
    submittedRoles: ROLES.filter((role) => Boolean(state.currentSubmissions[role])),
    currentPrompt: state.prompts[state.roundIndex],
    reveal: state.reveal,
    history: state.history,
    rematchVotes: Array.from(state.rematchVotes),
    winnerRole: state.winnerRole
  };
}

function isValidRanking(ranking: [number, number, number, number]): boolean {
  if (ranking.some((value) => value < 0 || value > 3)) {
    return false;
  }

  return new Set(ranking).size === 4;
}

function hasBoth(
  value: Partial<Record<Role, PrioritySubmission>>
): value is Record<Role, PrioritySubmission> {
  return Boolean(value.Sami) && Boolean(value.Patryk);
}

function resolveWinner(scores: GameScore): Role | undefined {
  if (scores.Sami === scores.Patryk) {
    return undefined;
  }

  return scores.Sami > scores.Patryk ? "Sami" : "Patryk";
}
