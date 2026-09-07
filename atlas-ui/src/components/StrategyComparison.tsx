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

function shufflePick<T>(arr: T[], n: number, seed: number): T[] {
  // Deterministic shuffle so same N gives same "random" pick across renders
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

function runBacktest(
  snapshot: Snapshot,
  pickFn: (historySoFar: Snapshot) => number[],
  costPerPeriod: number,
  payoutPerUnit: number
): BacktestResult | null {
  if (snapshot.periods.length < 2) return null;
  return backtest(
    snapshot,
    { mode: 'top-n', n: 0, payout_per_unit: payoutPerUnit, cost_per_unit: costPerPeriod },
    pickFn,
  );
}

export function StrategyComparison({ snapshot, n, costPerPeriod = 1, payoutPerUnit = 45 }: Props) {
  const { t } = useLocale();

  const results = useMemo(() => {
    if (snapshot.periods.length < 2) return null;

    const topNPick = (historySoFar: Snapshot) => {
      const pred = predict(historySoFar, TARGET_YEAR);
      return selectBalls(pred.ranked, 'top-n', n);
    };
    const coverNPick = (historySoFar: Snapshot) => {
      const pred = predict(historySoFar, TARGET_YEAR);
      return selectBalls(pred.ranked, 'cover-n', n);
    };
    const uniformPick = (historySoFar: Snapshot) => shufflePick(
      Array.from({ length: 49 }, (_, i) => i + 1),
      n,
      historySoFar.periods.length * 7
    );

    return {
      topN: runBacktest(snapshot, topNPick, costPerPeriod, payoutPerUnit),
      coverN: runBacktest(snapshot, coverNPick, costPerPeriod, payoutPerUnit),
      uniform: runBacktest(snapshot, uniformPick, costPerPeriod, payoutPerUnit),
    };
  }, [snapshot, n, costPerPeriod, payoutPerUnit]);

  if (!results || !results.topN || !results.coverN || !results.uniform) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        {t('strategy.needMoreData')}
      </div>
    );
  }

  const { topN, coverN, uniform } = results;
  const strategies = [
    { key: 'topN', name: t('strategy.topN'), desc: t('strategy.topNDesc'), result: topN },
    { key: 'coverN', name: t('strategy.coverN'), desc: t('strategy.coverNDesc'), result: coverN },
    { key: 'uniform', name: t('strategy.uniform'), desc: t('strategy.uniformDesc'), result: uniform },
  ];

  // Find the winner (highest hit rate)
  const winner = strategies.reduce((best, s) =>
    s.result.hit_rate > best.result.hit_rate ? s : best
  );

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('strategy.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          N={n} · {topN.total_periods} {t('backtest.onBets').split(' ')[1]}
        </span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('strategy.tag')}</p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {strategies.map(s => {
          const isWinner = s.key === winner.key;
          const lift = s.result.hit_rate - (n / 49);
          return (
            <div
              key={s.key}
              className={`
                panel-raised p-3
                ${isWinner ? 'border-emerald-500/40' : 'border-line-default'}
              `}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className={`text-xs font-medium ${isWinner ? 'text-emerald-200' : 'text-ink-secondary'}`}>
                  {s.name}
                </span>
                {isWinner && <span className="text-[10px] text-emerald-400">★</span>}
              </div>
              <div className="text-[10px] text-ink-muted mb-2 leading-tight">{s.desc}</div>
              <div className="num text-lg font-semibold text-ink-primary">
                {(s.result.hit_rate * 100).toFixed(1)}%
              </div>
              <div className={`num text-[10px] ${lift > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {lift > 0 ? '+' : ''}{(lift * 100).toFixed(2)}pp
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel-raised p-2.5 text-xs">
        <span className="text-ink-secondary">{t('strategy.winner')}: </span>
        <span className="font-medium text-emerald-300">{winner.name}</span>
        <span className="text-ink-muted"> · {(winner.result.hit_rate * 100).toFixed(1)}% hit rate</span>
      </div>
    </div>
  );
}