import { useLocale } from '../lib/i18n';

interface Props {
  selectedCount: number;
}

export function WinProbabilityCard({ selectedCount }: Props) {
  const { t } = useLocale();
  const n = Math.max(0, Math.min(45, selectedCount));

  // P(hit ≥ 1 of 7 balls) — assuming independent uniform draws
  // = 1 - product of (1 - i/49) for i in 0..6 (without replacement simplified)
  // = 1 - C(49-n, 7) / C(49, 7)
  function combinations(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  }
  const cAll = combinations(49, 7);
  const cMiss = combinations(49 - n, 7);
  const pAny = 1 - cMiss / cAll;

  // P(hit special / 7th ball) — uniform
  const pSpecial = n / 49;

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('winprob.title')}</h3>
        <span className="text-[10px] text-ink-muted uppercase tracking-wider">
          {t('winprob.tag')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="panel-raised p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-secondary">{t('winprob.pAny')}</span>
            <span className="num text-2xl font-semibold text-emerald-300">
              {(pAny * 100).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] text-ink-muted mt-1 leading-relaxed">
            {t('winprob.pAnyExplain')}
          </div>
          <div className="mt-2 text-[10px] text-ink-dim font-mono">
            {t('winprob.formula')}: 1 − C({49 - n}, 7) / C(49, 7) = 1 − {cMiss.toFixed(0)} / {cAll.toFixed(0)}
          </div>
        </div>

        <div className="panel-raised p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-secondary">{t('winprob.pSpecial')}</span>
            <span className="num text-2xl font-semibold text-amber-300">
              {(pSpecial * 100).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] text-ink-muted mt-1 leading-relaxed">
            {t('winprob.pSpecialExplain')}
          </div>
          <div className="mt-2 text-[10px] text-ink-dim font-mono">
            {t('winprob.formula')}: {n} / 49 = {(pSpecial * 100).toFixed(4)}%
          </div>
        </div>

        <div className="text-[10px] text-ink-muted pt-1 border-t border-line-subtle">
          {t('winprob.ballsSelected', { n })}
        </div>

        <div className="p-2 bg-bg-base border border-line-subtle rounded text-[10px] text-ink-muted leading-relaxed">
          {t('winprob.note')}
        </div>
      </div>
    </div>
  );
}