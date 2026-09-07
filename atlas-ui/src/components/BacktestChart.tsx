import type { BacktestResult } from '../lib/backtest';
import { useLocale } from '../lib/i18n';

interface Props {
  backtest: BacktestResult | null;
  expectedUniformRate: number;
}

export function BacktestChart({ backtest, expectedUniformRate }: Props) {
  const { t } = useLocale();

  if (!backtest || backtest.total_periods === 0) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        {t('backtest.placeholder', { n: backtest?.total_periods ?? 0 })}
      </div>
    );
  }

  const { per_period, hits, total_periods, hit_rate, lift, expected_roi, cumulative_pnl } = backtest;

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('backtest.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          {t('backtest.onBets', { n: total_periods })} · {t('backtest.hitsAndMisses', { hits, misses: total_periods - hits })}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="panel-raised p-2.5">
          <div className="label">{t('backtest.hitRate')}</div>
          <div className="num text-base font-semibold text-ink-primary mt-1">
            {(hit_rate * 100).toFixed(1)}%
          </div>
          <div className="num text-[10px] text-ink-muted mt-0.5">
            {t('backtest.vsUniform', { pp: (expectedUniformRate * 100).toFixed(1) })}
          </div>
        </div>
        <div className="panel-raised p-2.5">
          <div className="label">{t('backtest.lift')}</div>
          <div className={`num text-base font-semibold mt-1 ${lift > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {lift > 0 ? '+' : ''}{(lift * 100).toFixed(2)}pp
          </div>
          <div className="num text-[10px] text-ink-muted mt-0.5">
            {t('backtest.overUniform')}
          </div>
        </div>
        <div className="panel-raised p-2.5">
          <div className="label">{t('backtest.roi')}</div>
          <div className={`num text-base font-semibold mt-1 ${expected_roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(expected_roi * 100).toFixed(1)}%
          </div>
          <div className="num text-[10px] text-ink-muted mt-0.5">
            {t('backtest.overBacktest')}
          </div>
        </div>
        <div className="panel-raised p-2.5">
          <div className="label">{t('backtest.cumPL')}</div>
          <div className={`num text-base font-semibold mt-1 ${cumulative_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {cumulative_pnl >= 0 ? '+' : '-'}${Math.abs(cumulative_pnl).toFixed(0)}
          </div>
          <div className="num text-[10px] text-ink-muted mt-0.5">
            {t('backtest.onBets', { n: total_periods })}
          </div>
        </div>
      </div>

      <div className="relative h-10 bg-bg-base rounded border border-line-subtle overflow-hidden">
        {per_period.map((p, i) => {
          const x = (i / Math.max(per_period.length - 1, 1)) * 100;
          return (
            <div
              key={p.period_id}
              className={`absolute top-0 bottom-0 w-0.5 ${p.hit ? 'bg-emerald-400' : 'bg-red-500/40'}`}
              style={{ left: `${x}%` }}
              title={`#${p.period_id} ${p.draw_date}: ${p.hit ? 'HIT' : 'miss'} on ${p.special}`}
            />
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-muted pointer-events-none">
          {hits} {t('ranked.column.symbol').toLowerCase()} · {total_periods - hits} {t('backtest.title').toLowerCase()}
        </div>
      </div>

      <div className="text-[10px] text-ink-muted mt-2">
        {t('backtest.caveat')}
      </div>
    </div>
  );
}