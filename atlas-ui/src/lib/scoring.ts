// Dirichlet/Laplace-smoothed frequency scoring over historical special
// numbers (position=7 draws only). Ported from backend/app/services/scoring.py
// so recommendations can be computed client-side from the static snapshot.
//
// p_i = (count_i + alpha) / (sample_count + 49 * alpha)

export const BALL_COUNT = 49;
export const ALPHA = 1.0;
export const MODEL_NAME = 'dirichlet_frequency';
export const MODEL_VERSION = '1.0.0';
export const INSUFFICIENT_HISTORY_THRESHOLD = 100;

export interface BallScore {
  ball: number;
  probability: number;
  count: number;
}

/** history: special numbers (position=7 balls) in chronological order (oldest first). */
export function scoreSpecialNumbers(history: number[], alpha: number = ALPHA): BallScore[] {
  const counts = new Map<number, number>();
  for (let ball = 1; ball <= BALL_COUNT; ball++) counts.set(ball, 0);
  for (const ball of history) counts.set(ball, (counts.get(ball) ?? 0) + 1);

  const sampleCount = history.length;
  const denominator = sampleCount + BALL_COUNT * alpha;

  const scores: BallScore[] = [];
  for (let ball = 1; ball <= BALL_COUNT; ball++) {
    const count = counts.get(ball) ?? 0;
    scores.push({ ball, probability: (count + alpha) / denominator, count });
  }
  scores.sort((a, b) => b.probability - a.probability || b.count - a.count || a.ball - b.ball);
  return scores;
}

/** 0 means it appeared in the most recent draw. null means never seen. */
export function gapSinceLastSeen(history: number[], ball: number): number | null {
  for (let gap = 0; gap < history.length; gap++) {
    if (history[history.length - 1 - gap] === ball) return gap;
  }
  return null;
}

export function isInsufficientHistory(sampleCount: number): boolean {
  return sampleCount < INSUFFICIENT_HISTORY_THRESHOLD;
}
