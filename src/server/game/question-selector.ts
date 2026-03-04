import type {
  CouplePromptCard,
  GameId,
  QuestionCard,
  QuestionDifficultyBand,
  QuestionSmartMeta,
  QuizCategory,
  RepeatRisk,
  ScienceQuestionPrompt
} from "../../lib/types";
import type { AppDatabase } from "../db";
import {
  averageSuccessRate,
  computeNoveltyScore,
  difficultyFitScore,
  inferDifficultyBand,
  type QuestionStatsSnapshot
} from "./question-stats";

type QuestionGameId = "qa-lightning" | "better-half" | "science-quiz" | "couple-priorities";
type CandidateBase = {
  id: number;
  gameId: GameId;
  text: string;
  options: [string, string, string, string];
  source: "builtin" | "custom";
  category?: QuizCategory;
};

type SelectArgsBase = {
  db: AppDatabase;
  count: number;
  recentSessionsWindow?: number;
};

type SelectRelationArgs = SelectArgsBase & {
  gameId: "qa-lightning" | "better-half";
};

type SelectScienceArgs = SelectArgsBase & {
  gameId: "science-quiz";
  category: QuizCategory;
};

type SelectPrioritiesArgs = SelectArgsBase & {
  gameId: "couple-priorities";
};

type StatsMap = Map<number, QuestionStatsSnapshot>;

type RankedCandidate<T> = {
  candidate: T;
  novelty: number;
  difficultyBand: QuestionDifficultyBand;
  finalScore: number;
  successRate: number | undefined;
};

const TARGET_DIFFICULTY: Record<QuestionGameId, number> = {
  "qa-lightning": 0.55,
  "better-half": 0.5,
  "science-quiz": 0.65,
  "couple-priorities": 0.55
};

const FALLBACK_WINDOWS = [12, 6, 3, 0];

export function selectQuestions(args: SelectRelationArgs): QuestionCard[];
export function selectQuestions(
  args: SelectScienceArgs
): Array<ScienceQuestionPrompt & { correctIndex: number }>;
export function selectQuestions(args: SelectPrioritiesArgs): CouplePromptCard[];
export function selectQuestions(
  args: SelectRelationArgs | SelectScienceArgs | SelectPrioritiesArgs
):
  | QuestionCard[]
  | Array<ScienceQuestionPrompt & { correctIndex: number }>
  | CouplePromptCard[] {
  const recentSessionsWindow = args.recentSessionsWindow ?? 12;
  const count = Math.max(1, Math.trunc(args.count));
  if (args.gameId === "qa-lightning" || args.gameId === "better-half") {
    return selectFromCandidates({
      db: args.db,
      gameId: args.gameId,
      category: null,
      count,
      recentSessionsWindow,
      candidates: args.db.listQuestionCandidates(args.gameId)
    });
  }

  if (args.gameId === "science-quiz") {
    return selectFromCandidates({
      db: args.db,
      gameId: args.gameId,
      category: args.category,
      count,
      recentSessionsWindow,
      candidates: args.db.listScienceQuestionCandidates(args.category)
    });
  }

  return selectFromCandidates({
    db: args.db,
    gameId: args.gameId,
    category: null,
    count,
    recentSessionsWindow,
    candidates: args.db.listPriorityPromptCandidates()
  });
}

type RankArgs<T extends CandidateBase> = {
  pool: T[];
  targetDifficulty: number;
  nowMs: number;
  count: number;
  stats: StatsMap;
};

function rankAndSelect<T extends CandidateBase>({
  pool,
  targetDifficulty,
  nowMs,
  count,
  stats
}: RankArgs<T>): RankedCandidate<T>[] {
  const selected: RankedCandidate<T>[] = [];
  const remaining = [...pool];
  const customLimit = pool.length >= count * 3 ? Math.max(1, Math.floor(count * 0.25)) : count;
  const selectedThemeKeys: string[] = [];
  const selectedTokenSets: Set<string>[] = [];
  let selectedCustom = 0;

  while (selected.length < count && remaining.length > 0) {
    let best: RankedCandidate<T> | null = null;
    let bestIndex = -1;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const rowStats = stats.get(candidate.id);
      const successRate = averageSuccessRate(rowStats);
      const novelty = computeNoveltyScore(rowStats, nowMs);
      const diffFit = difficultyFitScore(successRate, targetDifficulty);
      const freshnessScore = computeFreshnessScore(rowStats, nowMs);

      let score = novelty * 0.42 + diffFit * 0.28 + freshnessScore * 0.18 + sourceScore(candidate.source) * 0.12;

      if (candidate.source === "custom" && selectedCustom >= customLimit) {
        score -= 0.45;
      }

      const candidateTheme = deriveThemeKey(candidate.text);
      if (selectedThemeKeys.length >= 2) {
        const last = selectedThemeKeys[selectedThemeKeys.length - 1];
        const beforeLast = selectedThemeKeys[selectedThemeKeys.length - 2];
        if (candidateTheme === last && candidateTheme === beforeLast) {
          score -= 0.35;
        }
      }

      const tokens = tokenize(candidate.text);
      if (selectedTokenSets.length > 0) {
        let maxSimilarity = 0;
        for (const selectedTokens of selectedTokenSets) {
          const similarity = jaccard(tokens, selectedTokens);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
        }

        if (maxSimilarity > 0.7) {
          score -= (maxSimilarity - 0.7) * 0.9;
        }
      }

      const ranked: RankedCandidate<T> = {
        candidate,
        novelty,
        difficultyBand: inferDifficultyBand(successRate, targetDifficulty),
        finalScore: score,
        successRate
      };

      if (!best || ranked.finalScore > best.finalScore) {
        best = ranked;
        bestIndex = index;
      }
    }

    if (!best || bestIndex === -1) {
      break;
    }

    selected.push(best);
    if (best.candidate.source === "custom") {
      selectedCustom += 1;
    }
    selectedThemeKeys.push(deriveThemeKey(best.candidate.text));
    selectedTokenSets.push(tokenize(best.candidate.text));
    remaining.splice(bestIndex, 1);
  }

  return selected;
}

function resolveFallbackWindow(input: {
  db: AppDatabase;
  gameId: QuestionGameId;
  category: QuizCategory | null;
  count: number;
  recentSessionsWindow: number;
  candidates: CandidateBase[];
}): number {
  const maxWindow = Math.max(0, Math.trunc(input.recentSessionsWindow));
  for (const fallback of FALLBACK_WINDOWS) {
    const window = Math.min(maxWindow, fallback);
    const excluded = window
      ? new Set(input.db.listRecentExposedQuestionIds(input.gameId, input.category, window))
      : new Set<number>();
    const available = window ? input.candidates.filter((candidate) => !excluded.has(candidate.id)) : input.candidates;
    if (available.length >= input.count) {
      return window;
    }
  }

  return 0;
}

function toStatsMap(
  rows: Array<{
    question_id: number;
    seen_count: number;
    success_sami: number;
    success_patryk: number;
    both_success: number;
    last_seen_at: string;
  }>
): StatsMap {
  const map = new Map<number, QuestionStatsSnapshot>();
  for (const row of rows) {
    map.set(row.question_id, {
      seenCount: row.seen_count,
      successSami: row.success_sami,
      successPatryk: row.success_patryk,
      bothSuccess: row.both_success,
      lastSeenAt: row.last_seen_at
    });
  }
  return map;
}

function computeFreshnessScore(stats: QuestionStatsSnapshot | undefined, nowMs: number): number {
  if (!stats) {
    return 1;
  }

  const lastMs = Date.parse(stats.lastSeenAt);
  if (Number.isNaN(lastMs)) {
    return 0.6;
  }

  const hours = Math.max(0, (nowMs - lastMs) / 3_600_000);
  if (hours >= 72) {
    return 1;
  }

  return Math.max(0.1, hours / 72);
}

function sourceScore(source: "builtin" | "custom"): number {
  return source === "builtin" ? 0.7 : 0.55;
}

function deriveThemeKey(text: string): string {
  const stopwords = new Set([
    "jak",
    "ile",
    "co",
    "czy",
    "ktory",
    "ktora",
    "ktore",
    "twoj",
    "twoja",
    "partner",
    "partnera",
    "pytaniu",
    "rundzie",
    "zadaniu"
  ]);

  const tokens = normalize(text)
    .split(" ")
    .filter((token) => token.length > 3 && !stopwords.has(token));

  return tokens[0] ?? "misc";
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((token) => token.length > 2 || /^\d+$/.test(token))
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function buildSmartReason<T extends CandidateBase>(
  candidate: RankedCandidate<T>,
  repeatRisk: RepeatRisk
): string {
  const parts: string[] = [];
  if (candidate.novelty > 0.8) {
    parts.push("świeże pytanie");
  } else if (candidate.novelty > 0.55) {
    parts.push("umiarkowanie świeże");
  } else {
    parts.push("utrzymanie różnorodności");
  }

  if (candidate.difficultyBand === "easy") {
    parts.push("lżejszy poziom");
  } else if (candidate.difficultyBand === "challenge") {
    parts.push("bardziej wymagające");
  } else {
    parts.push("zbalansowana trudność");
  }

  if (repeatRisk === "medium") {
    parts.push("częściowy fallback anty-powtórek");
  } else if (repeatRisk === "fallback") {
    parts.push("awaryjny fallback puli");
  }

  return parts.join(" · ");
}

function selectFromCandidates<T extends CandidateBase>(input: {
  db: AppDatabase;
  gameId: QuestionGameId;
  category: QuizCategory | null;
  count: number;
  recentSessionsWindow: number;
  candidates: T[];
}): T[] {
  if (input.candidates.length === 0) {
    return [];
  }

  const target = TARGET_DIFFICULTY[input.gameId];
  const nowMs = Date.now();
  const fallbackWindowUsed = resolveFallbackWindow({
    db: input.db,
    gameId: input.gameId,
    category: input.category,
    count: input.count,
    recentSessionsWindow: input.recentSessionsWindow,
    candidates: input.candidates
  });

  const recentExcludedIds =
    fallbackWindowUsed > 0
      ? new Set(
          input.db.listRecentExposedQuestionIds(
            input.gameId,
            input.category,
            fallbackWindowUsed
          )
        )
      : new Set<number>();

  const pool =
    fallbackWindowUsed > 0
      ? input.candidates.filter((candidate) => !recentExcludedIds.has(candidate.id))
      : input.candidates.slice();

  const statsRows = input.db.listQuestionStats(input.gameId, input.category);
  const stats = toStatsMap(statsRows);

  const selected = rankAndSelect({
    pool,
    targetDifficulty: target,
    nowMs,
    count: input.count,
    stats
  });

  const repeatRisk: RepeatRisk =
    fallbackWindowUsed === 12 ? "low" : fallbackWindowUsed > 0 ? "medium" : "fallback";

  return selected.map((entry) => {
    const smartMeta: QuestionSmartMeta = {
      noveltyScore: Number(entry.novelty.toFixed(3)),
      difficultyBand: entry.difficultyBand,
      repeatRisk,
      reason: buildSmartReason(entry, repeatRisk)
    };

    return {
      ...entry.candidate,
      smartMeta
    };
  });
}
