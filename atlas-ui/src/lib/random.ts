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

// Deterministic PRNG so the "daily pick" is stable for everyone on the same
// calendar day, without needing a server or localStorage.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function msUntilNextLocalMidnight(date: Date = new Date()): number {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return next.getTime() - date.getTime();
}

// Full 1-49 permutation seeded by the date key, so choosing a larger count
// later in the day only reveals more numbers rather than reshuffling.
export function dailyBallOrder(dateKey: string, rangeSize: number = 49): number[] {
  return pickRandomBalls(rangeSize, rangeSize, mulberry32(hashToSeed(dateKey)));
}
