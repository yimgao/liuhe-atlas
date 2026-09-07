import type { SelectionMode } from '../types';
import { useLocale } from '../lib/i18n';

interface Props {
  mode: SelectionMode;
  onChange: (mode: SelectionMode) => void;
  n: number;
  onNChange: (n: number) => void;
  selectedCount: number;
  onApplyRecommendation: () => void;
  onReset: () => void;
}

export function Controls({
  mode, onChange, n, onNChange, selectedCount, onApplyRecommendation, onReset,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="panel p-4 space-y-4">
      <div>
        <div className="label mb-2">{t('controls.mode')}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange('top-n')}
            className={`
              flex-1 px-3 py-2 rounded border text-xs font-medium transition
              ${mode === 'top-n'
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                : 'bg-bg-raised border-line-default text-ink-secondary hover:border-line-strong'
              }
            `}
          >
            {t('controls.modeTopN')}
            <span className="block text-[10px] mt-0.5 opacity-70 normal-case font-normal">
              {t('controls.modeTopNDesc')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange('cover-n')}
            className={`
              flex-1 px-3 py-2 rounded border text-xs font-medium transition
              ${mode === 'cover-n'
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                : 'bg-bg-raised border-line-default text-ink-secondary hover:border-line-strong'
              }
            `}
          >
            {t('controls.modeCoverN')}
            <span className="block text-[10px] mt-0.5 opacity-70 normal-case font-normal">
              {t('controls.modeCoverNDesc')}
            </span>
          </button>
        </div>
      </div>

      <div>
        <div className="h-row mb-2">
          <span className="label">{t('controls.count')}</span>
          <span className="num text-sm font-semibold text-ink-primary">{n}</span>
        </div>
        <input
          type="range"
          min={1}
          max={45}
          value={n}
          onChange={e => onNChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-ink-muted mt-1">
          <span>1</span>
          <span>22</span>
          <span>45</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-line-subtle">
        <button
          type="button"
          onClick={onApplyRecommendation}
          className="
            flex-1 px-3 py-2 rounded text-xs font-medium
            bg-emerald-500/15 border border-emerald-500/40 text-emerald-200
            hover:bg-emerald-500/25 transition
          "
        >
          {t('controls.apply')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="
            px-3 py-2 rounded text-xs font-medium
            bg-bg-raised border border-line-default text-ink-secondary
            hover:border-line-strong transition
          "
        >
          {t('controls.reset')}
        </button>
      </div>

      <div className="text-[10px] text-ink-muted text-center pt-2 border-t border-line-subtle">
        {t('controls.selectedCount')}:{' '}
        <span className="num text-ink-secondary font-medium">{selectedCount}</span>{' '}
        {t('controls.ballsUnit')}
      </div>
    </div>
  );
}