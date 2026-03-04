import type { QuestionDifficultyBand } from "../../lib/types";

export type QuestionStatsSnapshot = {
  seenCount: number;
  successSami: number;
  successPatryk: number;
  bothSuccess: number;
  lastSeenAt: string;
};

export function averageSuccessRate(stats?: QuestionStatsSnapshot): number | undefined {
  if (!stats || stats.seenCount <= 0) {
    return undefined;
  }

  return (stats.successSami + stats.successPatryk) / (2 * stats.seenCount);
}

export function computeNoveltyScore(stats: QuestionStatsSnapshot | undefined, nowMs: number): number {
  if (!stats || stats.seenCount <= 0) {
    return 1;
  }

  const lastSeenMs = Date.parse(stats.lastSeenAt);
  const daysSince = Number.isNaN(lastSeenMs) ? 30 : Math.max(0, (nowMs - lastSeenMs) / 86_400_000);
  const recencyFactor = clamp(daysSince / 21, 0, 1);
  const frequencyFactor = clamp(1 / (1 + Math.log2(stats.seenCount + 1)), 0, 1);

  return clamp(0.55 * recencyFactor + 0.45 * frequencyFactor, 0, 1);
}

export function inferDifficultyBand(
  successRate: number | undefined,
  targetDifficulty: number
): QuestionDifficultyBand {
  if (typeof successRate !== "number") {
    return "balanced";
  }

  if (successRate >= targetDifficulty + 0.12) {
    return "easy";
  }

  if (successRate <= targetDifficulty - 0.12) {
    return "challenge";
  }

  return "balanced";
}

export function difficultyFitScore(
  successRate: number | undefined,
  targetDifficulty: number
): number {
  if (typeof successRate !== "number") {
    return 0.66;
  }

  return clamp(1 - Math.abs(successRate - targetDifficulty), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
