import { useMemo } from 'react';
import type { Snapshot } from '../types';
import { chiSquareTest } from '../lib/statistics';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
}

interface DimTest {
  name: string;
  observed: number[];
  categories: string[];
  chi2: number;
  df: number;
  p_value: number;
  reject: boolean;
}

export function UniformityCheck({ snapshot }: Props) {
  const { t } = useLocale();

  const tests = useMemo<DimTest[]>(() => {
    const periods = snapshot.periods;
    if (periods.length === 0) return [];

    // Build observed counts for each dimension
    // Zodiac: 12 categories
    const zObs = new Array(12).fill(0);
    // Wuxing: 5 categories
    const wObs = new Array(5).fill(0);
    // Wave: 3 categories
    const vObs = new Array(3).fill(0);
    const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    const wuxings = ['金', '木', '水', '火', '土'];
    const waves = ['红', '蓝', '绿'];

    for (const p of periods) {
      for (const n of p.numbers) {
        const z = n.zodiac;
        const w = n.wuxing;
        const v = n.wave;
        const zi = zodiacs.indexOf(z ?? '');
        if (zi >= 0) zObs[zi]++;
        const wi = wuxings.indexOf(w ?? '');
        if (wi >= 0) wObs[wi]++;
        const vi = waves.indexOf(v ?? '');
        if (vi >= 0) vObs[vi]++;
      }
    }

    const totalZ = zObs.reduce((s, v) => s + v, 0);
    const totalW = wObs.reduce((s, v) => s + v, 0);
    const totalV = vObs.reduce((s, v) => s + v, 0);

    // expected per cat under uniform = total / N_cat
    function test(name: string, observed: number[], nCats: number, total: number, categories: string[]): DimTest {
      const expectedPerCat = total / nCats;
      const c2 = chiSquareTest(observed, expectedPerCat);
      return {
        name,
        observed,
        categories,
        chi2: c2.chi2,
        df: c2.df,
        p_value: c2.p_value,
        reject: c2.reject_null,
      };
    }

    return [
      test(t('uniformCheck.zodiacTest'), zObs, 12, totalZ, zodiacs),
      test(t('uniformCheck.wuxingTest'), wObs, 5, totalW, wuxings),
      test(t('uniformCheck.waveTest'), vObs, 3, totalV, waves),
    ];
  }, [snapshot, t]);

  if (tests.length === 0 || snapshot.periods.length === 0) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        Need data to compute uniformity test.
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('uniformCheck.title')}</h3>
        <span className="text-[10px] text-ink-muted num">{t('uniformCheck.tag')}</span>
      </div>
      <p className="text-[10px] text-ink-muted mb-3 leading-relaxed">{t('uniformCheck.note')}</p>

      <div className="space-y-3">
        {tests.map((test, idx) => (
          <div key={idx} className="panel-raised p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-ink-secondary">{test.name}</span>
              <span className={`num text-[10px] px-1.5 py-0.5 rounded ${
                test.reject
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}>
                {test.reject ? t('uniformCheck.rejectNull') : t('uniformCheck.failToReject')}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px] num">
              <div>
                <div className="text-ink-muted">χ²</div>
                <div className="text-ink-primary font-medium">{test.chi2.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-ink-muted">df</div>
                <div className="text-ink-secondary">{test.df}</div>
              </div>
              <div>
                <div className="text-ink-muted">{t('uniformCheck.pValue')}</div>
                <div className={`font-medium ${test.reject ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {test.p_value.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-ink-muted">α</div>
                <div className="text-ink-secondary">0.05</div>
              </div>
            </div>
            {/* Distribution bar */}
            <div className="mt-2 flex items-center gap-0.5 h-3">
              {test.observed.map((v, i) => {
                const max = Math.max(...test.observed, 1);
                const height = Math.max(8, (v / max) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/40 hover:bg-emerald-500/60 transition rounded-sm relative"
                    style={{ height: `${height}%` }}
                    title={`${test.categories[i]}: ${v}`}
                  >
                    {v > 0 && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-ink-muted num">
                        {v}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}