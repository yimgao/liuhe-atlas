// Year-aware zodiac maps, populated from snapshot.zodiac_maps
// Falls back to 2026 hardcoded mapping if year is missing.

import type { BallSymbol, Wuxing, Wave, OddEven, Zodiac } from '../types';

export const WUXING_MAP: Record<number, Wuxing> = {
  4: '金', 5: '金', 12: '金', 13: '金', 26: '金', 27: '金', 34: '金', 35: '金', 42: '金', 43: '金',
  8: '木', 9: '木', 16: '木', 17: '木', 24: '木', 25: '木', 38: '木', 39: '木', 46: '木', 47: '木',
  1: '水', 14: '水', 15: '水', 22: '水', 23: '水', 30: '水', 31: '水', 44: '水', 45: '水',
  2: '火', 3: '火', 10: '火', 11: '火', 18: '火', 19: '火', 32: '火', 33: '火', 40: '火', 41: '火', 48: '火', 49: '火',
  6: '土', 7: '土', 20: '土', 21: '土', 28: '土', 29: '土', 36: '土', 37: '土',
};

export const WAVE_MAP: Record<number, Wave> = {
  1: '红', 7: '红', 13: '红', 19: '红', 23: '红', 29: '红', 35: '红', 45: '红',
  2: '红', 8: '红', 12: '红', 18: '红', 24: '红', 30: '红', 34: '红', 40: '红', 46: '红',
  3: '蓝', 9: '蓝', 15: '蓝', 25: '蓝', 31: '蓝', 37: '蓝', 41: '蓝', 47: '蓝',
  4: '蓝', 10: '蓝', 14: '蓝', 20: '蓝', 26: '蓝', 36: '蓝', 42: '蓝', 48: '蓝',
  5: '绿', 11: '绿', 17: '绿', 21: '绿', 27: '绿', 33: '绿', 39: '绿', 43: '绿', 49: '绿',
  6: '绿', 16: '绿', 22: '绿', 28: '绿', 32: '绿', 38: '绿', 44: '绿',
};

export const ODD_EVEN_MAP: Record<number, OddEven> = {
  ...Object.fromEntries([...Array(49)].map((_, i) => {
    const n = i + 1;
    return [n, n % 2 === 1 ? '单' : '双'] as const;
  })),
};

// Default 2026 zodiac map (fallback) — strict 1-1 mapping derived from photo
export const ZODIAC_MAP_2026: Record<Zodiac, number[]> = {
  鼠: [7, 13, 19, 25, 31, 37, 43],
  牛: [6, 18, 24, 30, 36, 42, 48],
  虎: [5, 17, 23, 29, 35, 41, 47],
  兔: [4, 16, 22, 28, 34, 40, 46],
  龙: [3, 15, 21, 27, 33, 39, 45],
  蛇: [2, 14, 26, 38],
  马: [1, 49],
  羊: [12],
  猴: [11],
  鸡: [10],
  狗: [9],
  猪: [8, 20, 32, 44],
};

// Year-aware lookup: passed at runtime from snapshot
let YEARLY_NUMBER_TO_ZODIAC: Map<number, Map<number, Zodiac>> = new Map();

export function setYearlyZodiacMaps(zodiacMapsByYear: Record<number, Record<number, { zodiac: Zodiac }>>): void {
  YEARLY_NUMBER_TO_ZODIAC = new Map();
  for (const [year, ballMap] of Object.entries(zodiacMapsByYear)) {
    const yNum = Number(year);
    const m = new Map<number, Zodiac>();
    for (const [ballStr, info] of Object.entries(ballMap)) {
      const ball = Number(ballStr);
      if (info.zodiac) m.set(ball, info.zodiac as Zodiac);
    }
    YEARLY_NUMBER_TO_ZODIAC.set(yNum, m);
  }
}

export function getZodiacForBall(ball: number, year?: number): Zodiac {
  if (year !== undefined) {
    const m = YEARLY_NUMBER_TO_ZODIAC.get(year);
    if (m && m.has(ball)) return m.get(ball)!;
  }
  // Fallback to 2026 hardcoded
  const m = new Map<number, Zodiac>();
  for (const [zodiac, balls] of Object.entries(ZODIAC_MAP_2026) as [Zodiac, number[]][]) {
    for (const b of balls) m.set(b, zodiac);
  }
  return m.get(ball) ?? '鼠';
}

export function getSymbol(ball: number, year?: number): BallSymbol {
  return {
    ball,
    zodiac: getZodiacForBall(ball, year),
    wuxing: WUXING_MAP[ball] ?? '土',
    wave: WAVE_MAP[ball] ?? '红',
    odd_even: ODD_EVEN_MAP[ball] ?? '单',
  };
}

export const ALL_ZODIACS: Zodiac[] = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
export const ALL_WUXING: Wuxing[] = ['金', '木', '水', '火', '土'];
export const ALL_WAVES: Wave[] = ['红', '蓝', '绿'];