export type ScoreInput = {
  difficulty: 1 | 2 | 3;
  elapsedSeconds: number;
  pureCli: boolean;
};

type ScoreTiming = {
  perfectWindowSeconds: number;
  penaltyIntervalSeconds: number;
};

const BASE_SCORE = 100;
const MIN_SCORE = 60;
const ASSISTED_ACTION_PENALTY = 10;

const SCORE_TIMING_BY_DIFFICULTY: Record<ScoreInput['difficulty'], ScoreTiming> = {
  1: { perfectWindowSeconds: 30, penaltyIntervalSeconds: 20 },
  2: { perfectWindowSeconds: 90, penaltyIntervalSeconds: 45 },
  3: { perfectWindowSeconds: 180, penaltyIntervalSeconds: 90 }
};

export function calculateLevelScore({ difficulty, elapsedSeconds, pureCli }: ScoreInput): number {
  const timing = SCORE_TIMING_BY_DIFFICULTY[difficulty];
  const overtimeSeconds = Math.max(0, elapsedSeconds - timing.perfectWindowSeconds);
  const timePenalty = Math.ceil(overtimeSeconds / timing.penaltyIntervalSeconds) * 5;
  const assistedPenalty = pureCli ? 0 : ASSISTED_ACTION_PENALTY;
  return Math.max(MIN_SCORE, BASE_SCORE - timePenalty - assistedPenalty);
}
