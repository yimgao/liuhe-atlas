import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { predict, selectBalls } from '../lib/predictor';
import { backtest, type BacktestResult } from '../lib/backtest';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  n: number;
  costPerPeriod?: number;
  payoutPerUnit?: number;
}

const TARGET_YEAR = 2026;

function runWindow(
  snapshot: Snapshot,
  startIdx: number,
  endIdx: number,
  n: number,
  costPerPeriod: number,
  payoutPerUnit: number
): BacktestResult | null {
  const slice: Snapshot = {
    ...snapshot,
    periods: snapshot.periods.slice(startIdx, endIdx),
  };
  if (slice.periods.length < 2) return null;

  return backtest(
    slice,
    { mode: 'top-n', n: 0, payout_per_unit: payoutPerUnit, cost_per_unit: costPerPeriod },
    (historySoFar) => {
      const pred = predict(historySoFar, TARGET_YEAR);
      return selectBalls(pred.ranked, 'top-n', n);
    },
  );
}

export function RollingWindowBacktest({ snapshot, n, costPerPeriod = 1, payoutPerUnit = 45 }: Props) {
  const { t } = useLocale();

  const windows = useMemo(() => {
    // Sort periods ascending (oldest first) for time-series indexing
    const asc = [...snapshot.periods].sort((a, b) => a.period_id - b.period_id);
    const total = asc.length;
    if (total < 2) return null;

    // Index from end: last30 = last 30 periods, etc.
    const last30 = asc.slice(Math.max(0, total - 30));
    const last90 = asc.slice(Math.max(0, total - 90));

    return {
      last30: runWindow(snapshot, asc.length - last30.length, asc.length, n, costPerPeriod, payoutPerUnit),
      last90: runWindow(snapshot, asc.length - last90.length, asc.length, n, costPerPeriod, payoutPerUnit),
      full: runWindow(snapshot, 0, asc.length, n, costPerPeriod, payoutPerUnit),
      total,
    };
  }, [snapshot, n, costPerPeriod, payoutPerUnit]);

  if (!windows || !windows.last30 || !windows.full) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        Need ≥2 periods to compute rolling window backtest.
      </div>
    );
  }

  const renderWindow = (label: string, _key: 'last30' | 'last90' | 'full', result: BacktestResult) => (
    <div className="panel-raised p-3">
      <div className="text-xs text-ink-secondary mb-1">{label}</div>
      <div className="num text-base font-semibold text-ink-primary">
        {(result.hit_rate * 100).toFixed(1)}%
      </div>
      <div className="num text-[10px] text-ink-muted">
        {result.hits}/{result.total_periods} {t('rolling.cumulative')}
      </div>
    </div>
  );

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('rolling.title')}</h3>
        <span className="text-[10px] text-ink-muted num">{t('rolling.tag')}</span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('rolling.note')}</p>

      <div className="grid grid-cols-3 gap-3">
        {renderWindow(t('rolling.last30'), 'last30', windows.last30)}
        {windows.last90 && renderWindow(t('rolling.last90'), 'last90', windows.last90)}
        {renderWindow(t('rolling.full'), 'full', windows.full)}
      </div>

      {/* Cumulative sparkline */}
      <div className="mt-3 panel-raised p-3">
        <div className="text-[10px] text-ink-muted mb-1.5">
          {t('rolling.cumulative')} (N={n}, full history)
        </div>
        <div className="relative h-10 bg-bg-base rounded border border-line-subtle overflow-hidden">
          {windows.full.per_period.map((p, i, arr) => {
            const x = (i / Math.max(arr.length - 1, 1)) * 100;
            return (
              <div
                key={p.period_id}
                className={`absolute top-0 bottom-0 w-0.5 ${p.hit ? 'bg-emerald-400' : 'bg-red-500/40'}`}
                style={{ left: `${x}%` }}
                title={`#${p.period_id} ${p.hit ? 'hit' : 'miss'} on ${p.special}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}