// Domain types for liuhe-atlas-ui

export type Zodiac =
  | '鼠' | '牛' | '虎' | '兔' | '龙' | '蛇'
  | '马' | '羊' | '猴' | '鸡' | '狗' | '猪';

export type Wuxing = '金' | '木' | '水' | '火' | '土';
export type Wave = '红' | '蓝' | '绿';
export type OddEven = '单' | '双';

export interface BallSymbol {
  ball: number;
  zodiac: Zodiac;
  wuxing: Wuxing;
  wave: Wave;
  odd_even: OddEven;
}

export interface DrawnBall {
  position: number;   // 1-7
  ball: number;       // 1-49
  zodiac: Zodiac | null;
  wuxing: Wuxing | null;
  wave: Wave | null;
  odd_even: OddEven | null;
}

export interface Period {
  period_id: number;
  lottery_name: string;
  draw_date: string;
  source_domain: string;
  fetched_at: string;
  numbers: DrawnBall[];
}

export interface Snapshot {
  meta: {
    lottery_type: number;
    lottery_name: string;
    exported_at: string;
    period_count: number;
    real_period_count?: number;
    synthetic_period_count?: number;
    zodiac_map_years?: number[];
    note: string;
  };
  periods: Period[];
  zodiac_maps?: Record<number, Record<number, {
    zodiac: Zodiac | null;
    wuxing: Wuxing | null;
    wave: Wave | null;
    odd_even: OddEven | null;
  }>>;
}

export type SelectionMode = 'top-n' | 'cover-n';

export interface RankedBall {
  ball: number;
  probability: number;   // 0-1
  rank: number;          // 1-based
  symbol: BallSymbol;
}

export interface BacktestResult {
  total_periods: number;
  hits: number;
  hit_rate: number;       // 0-1
  expected_hits: number;  // under uniform baseline
  lift: number;           // hit_rate - expected_hits (can be negative)
  avg_payout: number;     // per-period simulated payout
  roi: number;            // return on investment (negative under honest conditions)
}

export interface CoverageReport {
  zodiac: Record<Zodiac, { selected: number; available: number }>;
  wuxing: Record<Wuxing, { selected: number; available: number }>;
  wave: Record<Wave, { selected: number; available: number }>;
  odd_even: Record<OddEven, { selected: number; available: number }>;
}