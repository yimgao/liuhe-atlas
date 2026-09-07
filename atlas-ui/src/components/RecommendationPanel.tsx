import type { PredictionResult } from '../lib/predictor';
import { useLocale } from '../lib/i18n';

interface Props {
  prediction: PredictionResult | null;
  selected: number[];
  year?: number;
}

const wuxingDot: Record<string, string> = {
  金: 'bg-yellow-400',
  木: 'bg-emerald-400',
  水: 'bg-blue-400',
  火: 'bg-red-400',
  土: 'bg-stone-400',
};

const waveText: Record<string, string> = {
  红: 'text-red-400',
  蓝: 'text-blue-400',
  绿: 'text-emerald-400',
};

export function RecommendationPanel({ prediction, selected }: Props) {
  const { t } = useLocale();

  if (!prediction) {
    return (
      <div className="panel p-4 h-full flex items-center justify-center text-ink-muted text-sm">
        {t('ranked.loading')}
      </div>
    );
  }

  const top = prediction.ranked.slice(0, 30);
  const selectedSet = new Set(selected);
  const maxProb = top[0]?.probability ?? 1 / 49;
  const minProb = top[top.length - 1]?.probability ?? 1 / 49;
  const range = Math.max(maxProb - minProb, 1e-6);

  return (
    <div className="panel p-4 flex flex-col h-full min-h-[480px]">
      <div className="h-row mb-3">
        <h3 className="label">{t('ranked.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          {t('ranked.maxProb')}={(maxProb * 100).toFixed(2)}% · {t('ranked.uniformProb')}={(1 / 49 * 100).toFixed(2)}%
        </span>
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-2">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-panel text-ink-muted">
            <tr className="text-left">
              <th className="font-medium py-1.5 w-8">{t('ranked.column.rank')}</th>
              <th className="font-medium py-1.5 w-12">{t('ranked.column.ball')}</th>
              <th className="font-medium py-1.5">{t('ranked.column.symbol')}</th>
              <th className="font-medium py-1.5 text-right">{t('ranked.column.prob')}</th>
              <th className="font-medium py-1.5 pl-3">{t('ranked.column.density')}</th>
            </tr>
          </thead>
          <tbody>
            {top.map(item => {
              const isSelected = selectedSet.has(item.ball);
              const heatVal = (item.probability - minProb) / range;
              return (
                <tr
                  key={item.ball}
                  className={`
                    border-t border-line-subtle/50
                    ${isSelected ? 'bg-amber-500/5' : ''}
                    hover:bg-bg-raised transition
                  `}
                >
                  <td className="py-1.5 num text-ink-muted">{item.rank}</td>
                  <td className="py-1.5 num">
                    <span className={`font-semibold ${waveText[item.symbol.wave]}`}>
                      {String(item.ball).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-1.5 text-ink-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${wuxingDot[item.symbol.wuxing]}`} />
                      <span>{item.symbol.zodiac}</span>
                      <span className="text-ink-muted">/</span>
                      <span>{item.symbol.wuxing}</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right num font-medium text-ink-primary">
                    {(item.probability * 100).toFixed(3)}%
                  </td>
                  <td className="py-1.5 pl-3 w-24">
                    <div className="h-1.5 bg-line-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-400 rounded-full"
                        style={{ width: `${(heatVal * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}