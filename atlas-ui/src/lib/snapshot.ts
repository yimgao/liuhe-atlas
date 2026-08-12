// Loads the static, cron-refreshed snapshot.json (public/data/snapshot.json)
// that ships with the site build. No backend server is required at runtime.

const SPECIAL_NUMBER_POSITION = 7;
const SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/snapshot.json`;

export interface SnapshotNumber {
  position: number;
  ball: number;
  zodiac: string;
  wuxing: string;
  wave: string;
  odd_even: string;
}

export interface SnapshotPeriod {
  period_id: number;
  lottery_name: string;
  draw_date: string;
  source_domain: string;
  fetched_at: string;
  numbers: SnapshotNumber[];
}

interface Snapshot {
  meta: Record<string, unknown>;
  periods: SnapshotPeriod[];
}

export class SnapshotError extends Error {}

let cached: Promise<SnapshotPeriod[]> | null = null;

async function fetchSnapshot(): Promise<SnapshotPeriod[]> {
  const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new SnapshotError(`快照数据加载失败 (HTTP ${res.status})`);
  }
  const data = (await res.json()) as Snapshot;
  return [...data.periods].sort((a, b) => a.period_id - b.period_id);
}

/** Chronological (oldest first) periods, cached for the session. */
export function loadPeriods(): Promise<SnapshotPeriod[]> {
  if (!cached) {
    cached = fetchSnapshot().catch((e: unknown) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}

export function specialNumberHistory(periods: SnapshotPeriod[]): number[] {
  const history: number[] = [];
  for (const period of periods) {
    const special = period.numbers.find((n) => n.position === SPECIAL_NUMBER_POSITION);
    if (special) history.push(special.ball);
  }
  return history;
}

export function latestDraw(
  periods: SnapshotPeriod[],
): { period_id: number; draw_date: string; special_number: number } | null {
  const latest = periods[periods.length - 1];
  if (!latest) return null;
  const special = latest.numbers.find((n) => n.position === SPECIAL_NUMBER_POSITION);
  if (!special) return null;
  return { period_id: latest.period_id, draw_date: latest.draw_date, special_number: special.ball };
}
