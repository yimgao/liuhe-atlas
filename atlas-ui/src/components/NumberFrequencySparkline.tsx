import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { computeBallFreqs, chiSquareTest } from '../lib/statistics';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
}

const ALL_BALLS = Array.from({ length: 49 }, (_, i) => i + 1);

export function NumberFrequencySparkline({ snapshot }: Props) {
  const { t } = useLocale();

  const { freqs, chi2, maxCount, total } = useMemo(() => {
    const freqs = computeBallFreqs(snapshot);
    const total = freqs.reduce((s, f) => s + f.count, 0);
    const maxCount = Math.max(1, ...freqs.map(f => f.count));
    const chi2 = chiSquareTest(freqs.map(f => f.count), 1);
    return { freqs, maxCount, total, chi2 };
  }, [snapshot]);

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('freq.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          {t('freq.tag')} · n={total}
        </span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('freq.subtitle')}</p>

      {/* Sparkline grid: 7 cols × 7 rows */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {ALL_BALLS.map(ball => {
          const f = freqs[ball - 1];
          const heightPct = (f.count / maxCount) * 100;
          // Color: red if z > 2, green if z < -2, gray otherwise
          let barColor = 'bg-bg-overlay';
          let textColor = 'text-ink-muted';
          if (Math.abs(f.z_score) > 1.5) {
            barColor = f.z_score > 0 ? 'bg-emerald-500/70' : 'bg-red-500/70';
            textColor = f.z_score > 0 ? 'text-emerald-200' : 'text-red-200';
          } else if (Math.abs(f.z_score) > 0.5) {
            barColor = f.z_score > 0 ? 'bg-emerald-500/30' : 'bg-red-500/30';
            textColor = 'text-ink-secondary';
          }

          return (
            <div key={ball} className="flex flex-col items-center gap-0.5">
              <div className="num text-[9px] text-ink-secondary">
                {f.count}
              </div>
              <div className="w-full h-12 bg-bg-base border border-line-subtle/40 rounded-sm relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 ${barColor} transition-all`}
                  style={{ height: `${Math.max(2, heightPct)}%` }}
                />
              </div>
              <div className={`num text-[10px] ${textColor} font-medium`}>
                {String(ball).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chi-square summary */}
      <div className="panel-raised p-3 text-xs">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-ink-secondary">{t('freq.chiSquare')} (uniform test)</span>
          <span className="num text-ink-primary font-medium">
            χ² = {chi2.chi2.toFixed(2)}, df = {chi2.df}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-ink-secondary">{t('uniformCheck.pValue')}</span>
          <span className={`num font-medium ${chi2.p_value < 0.05 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {chi2.p_value.toFixed(4)}
          </span>
        </div>
        <div className={`mt-2 text-[10px] ${chi2.reject_null ? 'text-amber-300' : 'text-emerald-300'}`}>
          {chi2.reject_null ? t('uniformCheck.rejectNull') : t('uniformCheck.failToReject')}
        </div>
      </div>
    </div>
  );
}