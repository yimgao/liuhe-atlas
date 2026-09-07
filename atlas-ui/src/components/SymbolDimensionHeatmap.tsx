import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { computeSymbolMatrix } from '../lib/statistics';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  limit?: number;
}

export function SymbolDimensionHeatmap({ snapshot, limit = 12 }: Props) {
  const { t } = useLocale();

  const matrix = useMemo(() => computeSymbolMatrix(snapshot, limit), [snapshot, limit]);

  // Compute max value per dimension for color normalization
  const maxZodiac = Math.max(1, ...Object.values(matrix.zodiacGrid).flatMap(g => Object.values(g)));
  const maxWuxing = Math.max(1, ...Object.values(matrix.wuxingGrid).flatMap(g => Object.values(g)));
  const maxWave = Math.max(1, ...Object.values(matrix.waveGrid).flatMap(g => Object.values(g)));

  function heatColor(value: number, max: number): string {
    if (value === 0) return 'bg-bg-raised';
    const ratio = value / max;
    if (ratio >= 0.7) return 'bg-emerald-500/60 text-emerald-100';
    if (ratio >= 0.4) return 'bg-emerald-500/40 text-emerald-200';
    if (ratio >= 0.2) return 'bg-emerald-500/20 text-emerald-300';
    return 'bg-emerald-500/10 text-ink-secondary';
  }

  if (matrix.periods.length === 0) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        Need ≥1 period to display heatmap.
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('heatmap.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          {matrix.periods.length} {t('heatmap.row')}s
        </span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('heatmap.subtitle')}</p>

      {/* Zodiac heatmap (12 columns × N rows) */}
      <div className="mb-4">
        <div className="label mb-1.5">{t('heatmap.colZodiac')} (12)</div>
        <div className="overflow-x-auto">
          <table className="text-[10px] num">
            <thead>
              <tr className="text-ink-muted">
                <th className="px-1 py-0.5 text-left sticky left-0 bg-bg-panel">{t('heatmap.row')}</th>
                {matrix.zodiacs.map(z => (
                  <th key={z} className="px-1 py-0.5 text-center w-6">{z}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.periods.map(pid => (
                <tr key={pid} className="border-t border-line-subtle/30">
                  <td className="px-1 py-0.5 text-ink-secondary sticky left-0 bg-bg-panel">{pid}</td>
                  {matrix.zodiacs.map(z => {
                    const v = matrix.zodiacGrid[pid]?.[z] ?? 0;
                    return (
                      <td key={z} className={`px-1 py-0.5 text-center rounded-sm ${heatColor(v, maxZodiac)}`}>
                        {v || '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wuxing heatmap (5 columns) */}
      <div className="mb-4">
        <div className="label mb-1.5">{t('heatmap.colWuxing')} (5)</div>
        <div className="overflow-x-auto">
          <table className="text-[10px] num">
            <thead>
              <tr className="text-ink-muted">
                <th className="px-1 py-0.5 text-left sticky left-0 bg-bg-panel">{t('heatmap.row')}</th>
                {matrix.wuxings.map(w => (
                  <th key={w} className="px-1 py-0.5 text-center w-8">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.periods.map(pid => (
                <tr key={pid} className="border-t border-line-subtle/30">
                  <td className="px-1 py-0.5 text-ink-secondary sticky left-0 bg-bg-panel">{pid}</td>
                  {matrix.wuxings.map(w => {
                    const v = matrix.wuxingGrid[pid]?.[w] ?? 0;
                    return (
                      <td key={w} className={`px-1 py-0.5 text-center rounded-sm ${heatColor(v, maxWuxing)}`}>
                        {v || '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wave heatmap (3 columns) */}
      <div>
        <div className="label mb-1.5">{t('heatmap.colWave')} (3)</div>
        <div className="overflow-x-auto">
          <table className="text-[10px] num">
            <thead>
              <tr className="text-ink-muted">
                <th className="px-1 py-0.5 text-left sticky left-0 bg-bg-panel">{t('heatmap.row')}</th>
                {matrix.waves.map(w => (
                  <th key={w} className="px-1 py-0.5 text-center w-8">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.periods.map(pid => (
                <tr key={pid} className="border-t border-line-subtle/30">
                  <td className="px-1 py-0.5 text-ink-secondary sticky left-0 bg-bg-panel">{pid}</td>
                  {matrix.waves.map(w => {
                    const v = matrix.waveGrid[pid]?.[w] ?? 0;
                    return (
                      <td key={w} className={`px-1 py-0.5 text-center rounded-sm ${heatColor(v, maxWave)}`}>
                        {v || '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}