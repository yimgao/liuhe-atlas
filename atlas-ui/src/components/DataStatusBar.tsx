import type { Snapshot } from '../types';
import type { PredictionResult } from '../lib/predictor';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  prediction: PredictionResult | null;
}

const signalColor = {
  'no-signal': 'text-ink-muted',
  'weak': 'text-amber-400',
  'moderate': 'text-emerald-400',
  'strong': 'text-emerald-300',
};

export function DataStatusBar({ snapshot, prediction }: Props) {
  const { t, locale } = useLocale();
  const exported = new Date(snapshot.meta.exported_at);
  const exportedStr = exported.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const realCount = snapshot.meta.real_period_count ?? snapshot.periods.length;
  const syntheticCount = snapshot.meta.synthetic_period_count ?? 0;
  const hasSynthetic = syntheticCount > 0;

  const signalLabel = {
    'no-signal': t('status.signalNoSignal'),
    'weak': t('status.signalWeak'),
    'moderate': t('status.signalModerate'),
    'strong': t('status.signalStrong'),
  };

  return (
    <div className="space-y-2">
      <div className="panel px-4 py-3 flex items-center justify-between gap-6 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="label mr-2">{t('status.data')}</span>
            <span className="font-medium text-ink-secondary">{snapshot.meta.lottery_name}</span>
            <span className="text-ink-muted mx-2">·</span>
            <span className="num text-ink-secondary">
              {prediction?.dataScope.total_periods ?? snapshot.periods.length} periods
            </span>
            <span className="text-ink-muted mx-2">·</span>
            <span className="num text-ink-secondary">
              {prediction?.dataScope.total_draws ?? 0} {t('status.draws')}
            </span>
          </div>
          <div>
            <span className="label mr-2">{t('status.updated')}</span>
            <span className="num text-ink-secondary">{exportedStr}</span>
          </div>
          <div>
            <span className="label mr-2">{t('status.model')}</span>
            <span className="font-mono text-ink-secondary">Bayesian L2 (symbol-aggregated)</span>
          </div>
        </div>

        {prediction && (() => {
          const interp = prediction.signalStrength.interpretation as keyof typeof signalColor;
          return (
            <div className="flex items-center gap-3">
              <span className="label">{t('status.signal')}</span>
              <span className={`num font-semibold tracking-wider text-[11px] ${signalColor[interp]}`}>
                {signalLabel[interp]}
              </span>
              <span className="num text-ink-muted text-[10px]">
                KL={prediction.signalStrength.kl_divergence.toFixed(4)}
              </span>
            </div>
          );
        })()}
      </div>

      {hasSynthetic && (
        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-300">⚠</span>
            <span className="text-amber-200">
              {t('status.mixedWarning', { real: realCount, synthetic: syntheticCount })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}