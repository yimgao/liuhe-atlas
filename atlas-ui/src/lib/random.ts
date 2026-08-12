export function pickRandomBalls(
  n: number,
  rangeSize: number = 49,
  rng: () => number = Math.random,
): number[] {
  const pool = Array.from({ length: rangeSize }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
