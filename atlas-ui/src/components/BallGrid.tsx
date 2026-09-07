import { getSymbol } from '../lib/symbolMaps';
import { useLocale } from '../lib/i18n';
import type { Wuxing, Wave } from '../types';

interface Props {
  selected: Set<number>;
  onToggle: (ball: number) => void;
  topN: number[];
  coverN: number[];
  mode: 'top-n' | 'cover-n';
  year?: number;
}

const wuxingBg: Record<Wuxing, string> = {
  金: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  木: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  水: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
  火: 'bg-red-500/15 border-red-500/40 text-red-200',
  土: 'bg-stone-500/15 border-stone-500/40 text-stone-200',
};

const waveText: Record<Wave, string> = {
  红: 'text-red-400',
  蓝: 'text-blue-400',
  绿: 'text-emerald-400',
};

export function BallGrid({ selected, onToggle, topN, coverN, mode, year = 2026 }: Props) {
  const { t } = useLocale();
  const recommended = mode === 'top-n' ? new Set(topN) : new Set(coverN);

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">
          {t('grid.title')}
          <span className="text-ink-muted"> ({year} {t('grid.yearSuffix')})</span>
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-ink-muted">
          <span>{t('grid.legend')}</span>
          <span>·</span>
          <span className="text-emerald-400">{t('grid.recommended')}</span>
          <span className="text-amber-400">{t('grid.selected')}</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 49 }, (_, i) => i + 1).map(ball => {
          const sym = getSymbol(ball, year);
          const isSelected = selected.has(ball);
          const isRecommended = recommended.has(ball);

          return (
            <button
              key={ball}
              type="button"
              onClick={() => onToggle(ball)}
              aria-label={`Ball ${ball}: ${sym.zodiac} ${sym.wuxing} ${sym.wave}`}
              className={`
                relative aspect-square
                num text-sm font-medium
                border rounded-md
                transition-all duration-150
                ${wuxingBg[sym.wuxing]}
                ${waveText[sym.wave]}
                ${isSelected
                  ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-bg-panel scale-105 shadow-glow-amber'
                  : isRecommended
                    ? 'ring-1 ring-emerald-400/60'
                    : 'opacity-60 hover:opacity-100'
                }
                active:scale-95
              `}
              title={`${ball} | ${sym.zodiac} | ${sym.wuxing} | ${sym.wave} | ${sym.odd_even}`}
            >
              {String(ball).padStart(2, '0')}
              {isRecommended && !isSelected && (
                <span className="absolute top-0.5 right-0.5 text-[8px] text-emerald-400">●</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}