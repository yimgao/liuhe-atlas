/**
 * Coverage analyzer — given a set of selected balls, compute coverage stats per symbol dimension.
 * Uses the runtime-set year maps for year-aware zodiac lookup.
 */

import type { CoverageReport } from '../types';
import {
  WUXING_MAP, WAVE_MAP, ODD_EVEN_MAP,
  ALL_ZODIACS, ALL_WUXING, ALL_WAVES,
  getZodiacForBall,
} from './symbolMaps';

export function analyzeCoverage(selected: number[], year: number = 2026): CoverageReport {
  const zodiac: CoverageReport['zodiac'] = Object.fromEntries(
    ALL_ZODIACS.map(z => [z, { selected: 0, available: 0 }])
  ) as CoverageReport['zodiac'];
  const wuxing: CoverageReport['wuxing'] = Object.fromEntries(
    ALL_WUXING.map(w => [w, { selected: 0, available: 0 }])
  ) as CoverageReport['wuxing'];
  const wave: CoverageReport['wave'] = Object.fromEntries(
    ALL_WAVES.map(w => [w, { selected: 0, available: 0 }])
  ) as CoverageReport['wave'];
  const odd_even: CoverageReport['odd_even'] = {
    单: { selected: 0, available: 0 },
    双: { selected: 0, available: 0 },
  };

  // Count available per dim (all 49 balls)
  for (let ball = 1; ball <= 49; ball++) {
    const z = getZodiacForBall(ball, year);
    const w = WUXING_MAP[ball];
    const v = WAVE_MAP[ball];
    const oe = ODD_EVEN_MAP[ball];
    if (z) zodiac[z].available++;
    if (w) wuxing[w].available++;
    if (v) wave[v].available++;
    if (oe) odd_even[oe].available++;
  }

  // Count selected per dim
  for (const ball of selected) {
    const z = getZodiacForBall(ball, year);
    const w = WUXING_MAP[ball];
    const v = WAVE_MAP[ball];
    const oe = ODD_EVEN_MAP[ball];
    if (z && z in zodiac) zodiac[z].selected++;
    if (w && w in wuxing) wuxing[w].selected++;
    if (v && v in wave) wave[v].selected++;
    if (oe && oe in odd_even) odd_even[oe].selected++;
  }

  return { zodiac, wuxing, wave, odd_even };
}