import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
}

interface DimStat {
  name: string;
  categories: string[];
  observed: number[];
  expected: number;
  max_actual: number;
  max_category: string;
  lift_pct: number;  // (max - expected) / expected * 100
}

function dimStats(snapshot: Snapshot): DimStat[] {
  if (snapshot.periods.length === 0) return [];

  const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const wuxings = ['金', '木', '水', '火', '土'];
  const waves = ['红', '蓝', '绿'];

  const zObs = new Array(12).fill(0);
  const wObs = new Array(5).fill(0);
  const vObs = new Array(3).fill(0);

  for (const p of snapshot.periods) {
    for (const n of p.numbers) {
      const z = zodiacs.indexOf(n.zodiac ?? '');
      if (z >= 0) zObs[z]++;
      const w = wuxings.indexOf(n.wuxing ?? '');
      if (w >= 0) wObs[w]++;
      const v = waves.indexOf(n.wave ?? '');
      if (v >= 0) vObs[v]++;
    }
  }

  function build(name: string, observed: number[], categories: string[]): DimStat {
    const total = observed.reduce((s, v) => s + v, 0);
    const expected = total / observed.length;
    const maxIdx = observed.indexOf(Math.max(...observed));
    return {
      name,
      categories,
      observed,
      expected,
      max_actual: observed[maxIdx] ?? 0,
      max_category: categories[maxIdx] ?? '',
      lift_pct: expected > 0 ? ((observed[maxIdx] - expected) / expected) * 100 : 0,
    };
  }

  return [
    build('zodiac', zObs, zodiacs),
    build('wuxing', wObs, wuxings),
    build('wave', vObs, waves),
  ];
}

const dimLabelKey = { zodiac: 'breakdown.zodiac', wuxing: 'breakdown.wuxing', wave: 'breakdown.wave' } as const;

export function SymbolDimensionBreakdown({ snapshot }: Props) {
  const { t } = useLocale();
  const stats = useMemo(() => dimStats(snapshot), [snapshot]);

  if (stats.length === 0) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        Need ≥1 period to compute symbol breakdown.
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('breakdown.title')}</h3>
        <span className="text-[10px] text-ink-muted num">{t('breakdown.tag')}</span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('breakdown.note')}</p>

      <div className="space-y-3">
        {stats.map(stat => (
          <div key={stat.name} className="panel-raised p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-ink-secondary">
                {t(dimLabelKey[stat.name as keyof typeof dimLabelKey])} ({stat.categories.length})
              </span>
              <span className={`num text-xs ${stat.lift_pct > 5 ? 'text-emerald-300' : 'text-ink-muted'}`}>
                {t('breakdown.lift')}: {stat.lift_pct >= 0 ? '+' : ''}{stat.lift_pct.toFixed(1)}%
              </span>
            </div>

            {/* Horizontal bar chart */}
            <div className="space-y-1">
              {stat.observed.map((count, i) => {
                const max = Math.max(...stat.observed, 1);
                const barPct = (count / max) * 100;
                const liftFromExpected = stat.expected > 0 ? ((count - stat.expected) / stat.expected) * 100 : 0;
                const isMax = i === stat.observed.indexOf(Math.max(...stat.observed));
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px] num">
                    <span className={`w-6 text-center ${isMax ? 'text-emerald-300 font-semibold' : 'text-ink-muted'}`}>
                      {stat.categories[i]}
                    </span>
                    <div className="flex-1 h-3 bg-bg-base rounded-sm relative overflow-hidden border border-line-subtle/40">
                      <div
                        className={`absolute left-0 top-0 bottom-0 ${isMax ? 'bg-emerald-500/70' : 'bg-emerald-500/30'} transition-all`}
                        style={{ width: `${Math.max(2, barPct)}%` }}
                      />
                    </div>
                    <span className={`w-8 text-right ${count > stat.expected ? 'text-emerald-300' : count < stat.expected ? 'text-red-300' : 'text-ink-secondary'}`}>
                      {count}
                    </span>
                    <span className="w-12 text-right text-ink-muted">
                      {liftFromExpected >= 0 ? '+' : ''}{liftFromExpected.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-line-subtle/50 flex justify-between text-[10px]">
              <span className="text-ink-muted">
                {t('breakdown.uniform')}: <span className="num text-ink-secondary">{stat.expected.toFixed(2)}</span>
              </span>
              <span className="text-ink-muted">
                max: <span className="num text-ink-secondary">{stat.max_category} ({stat.max_actual})</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 panel-raised p-2.5 text-[10px] text-ink-muted">
        📊 Best discriminating dimension:{' '}
        <span className="text-emerald-300 font-medium">
          {stats.reduce((best, s) => Math.abs(s.lift_pct) > Math.abs(best.lift_pct) ? s : best).name}
        </span>
        {' '}(|lift| = {Math.abs(stats.reduce((best, s) => Math.abs(s.lift_pct) > Math.abs(best.lift_pct) ? s : best).lift_pct).toFixed(1)}%)
      </div>
    </div>
  );
}