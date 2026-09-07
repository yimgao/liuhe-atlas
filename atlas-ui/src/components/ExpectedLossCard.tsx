import { useMemo, useState } from 'react';
import { expectedLoss } from '../lib/backtest';
import { useLocale } from '../lib/i18n';

interface Props {
  selectedCount: number;
  costPerPeriod: number;
}

export function ExpectedLossCard({ selectedCount, costPerPeriod }: Props) {
  const { t } = useLocale();
  const [payout, setPayout] = useState(45);
  const [periodsPerYear, setPeriodsPerYear] = useState(156);
  const [years, setYears] = useState(10);

  const result = useMemo(() => expectedLoss({
    n: selectedCount,
    cost_per_period: costPerPeriod,
    payout,
    periods_per_year: periodsPerYear,
    years,
  }), [selectedCount, costPerPeriod, payout, periodsPerYear, years]);

  // Pick warning text by expected ROI severity
  let warning: string;
  const pct = Math.abs(result.expected_pnl_pct) * 100;
  if (result.expected_pnl_pct < -0.5) {
    warning = t('loss.warningBad', { years });
  } else if (result.expected_pnl_pct < -0.1) {
    warning = t('loss.warningModerate', { years, pct: pct.toFixed(0) });
  } else if (result.expected_pnl_pct < 0) {
    warning = t('loss.warningSlight', { years, pct: pct.toFixed(1) });
  } else if (payout >= 49 && selectedCount >= 45) {
    warning = t('loss.warningFair');
  } else {
    warning = t('loss.warningUnfair', { payout, fair: (49 / Math.max(selectedCount, 1)).toFixed(1) });
  }

  const isLargeLoss = result.expected_pnl_pct < -0.1;

  return (
    <div className={`panel p-4 border ${isLargeLoss ? 'border-red-500/40' : 'border-line-subtle'}`}>
      <div className="h-row mb-3">
        <h3 className="label">{t('loss.title')}</h3>
        <span className="text-[10px] text-ink-muted uppercase tracking-wider">
          {t('loss.tag')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
        <label className="block">
          <span className="label">{t('loss.payout')}</span>
          <input
            type="number"
            min={1}
            max={200}
            value={payout}
            onChange={e => setPayout(Number(e.target.value) || 45)}
            className="num w-full mt-1 px-2 py-1.5 bg-bg-base border border-line-default rounded text-ink-primary"
          />
        </label>
        <label className="block">
          <span className="label">{t('loss.perYear')}</span>
          <input
            type="number"
            min={1}
            value={periodsPerYear}
            onChange={e => setPeriodsPerYear(Number(e.target.value) || 1)}
            className="num w-full mt-1 px-2 py-1.5 bg-bg-base border border-line-default rounded text-ink-primary"
          />
        </label>
        <label className="block">
          <span className="label">{t('loss.years')}</span>
          <input
            type="number"
            min={1}
            value={years}
            onChange={e => setYears(Number(e.target.value) || 1)}
            className="num w-full mt-1 px-2 py-1.5 bg-bg-base border border-line-default rounded text-ink-primary"
          />
        </label>
      </div>

      <div className="space-y-2 pt-3 border-t border-line-subtle">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-secondary">{t('loss.totalStake')}</span>
          <span className="num text-sm text-ink-primary font-medium">
            ${result.total_cost.toLocaleString()}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-ink-secondary">{t('loss.expectedPayout')}</span>
          <span className="num text-sm text-ink-secondary">
            ${result.total_expected_payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-baseline justify-between pt-2 border-t border-line-subtle/50">
          <span className="text-xs text-ink-primary font-medium">{t('loss.expectedPL')}</span>
          <span className={`num text-lg font-semibold ${result.expected_pnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {result.expected_pnl < 0 ? '-' : '+'}${Math.abs(result.expected_pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider">{t('loss.roi')}</span>
          <span className={`num text-xs font-medium ${result.expected_pnl_pct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {(result.expected_pnl_pct * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className={`mt-3 p-2.5 text-xs rounded border ${isLargeLoss ? 'bg-red-500/5 border-red-500/30 text-red-300' : 'bg-bg-raised border-line-default text-ink-secondary'}`}>
        {warning}
      </div>
    </div>
  );
}