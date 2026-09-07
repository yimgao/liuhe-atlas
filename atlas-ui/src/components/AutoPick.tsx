import { useMemo, useState } from 'react';
import type { Snapshot } from '../types';
import { predict, type PredictionResult } from '../lib/predictor';
import { computeBallFreqs } from '../lib/statistics';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  n: number;
  onPick: (balls: number[]) => void;
}

type AutoMode = 'combine' | 'intersection' | 'model' | 'frequency';

export function AutoPick({ snapshot, n, onPick }: Props) {
  const { t } = useLocale();
  const [mode, setMode] = useState<AutoMode>('combine');

  const result = useMemo(() => {
    if (snapshot.periods.length === 0) return null;

    const pred: PredictionResult = predict(snapshot, 2026);
    const freqs = computeBallFreqs(snapshot);

    // Method 1: Top-N model picks (highest model probability)
    const topNModel = pred.ranked.slice(0, n).map(r => r.ball);

    // Method 2: Top-N frequency picks (highest historical frequency)
    const topNFreq = [...freqs]
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
      .map(f => f.ball);

    // Method 3: Intersection (balls in BOTH top-N lists)
    const intersectSet = new Set(topNModel);
    const intersection = topNFreq.filter(b => intersectSet.has(b));

    // Method 4: Combined (max of normalized scores)
    // Map both into [0, 1] and take weighted average
    const modelMax = pred.ranked[0]?.probability ?? 1;
    const modelMin = pred.ranked[48]?.probability ?? 0;
    const freqMax = Math.max(...freqs.map(f => f.count), 1);
    const freqMin = Math.min(...freqs.map(f => f.count), 0);

    const combined = Array.from({ length: 49 }, (_, i) => {
      const ball = i + 1;
      const modelScore = (pred.ranked.find(r => r.ball === ball)?.probability ?? 0 - modelMin) / Math.max(1e-6, modelMax - modelMin);
      const freqScore = (freqs[i].count - freqMin) / Math.max(1, freqMax - freqMin);
      return { ball, score: 0.6 * modelScore + 0.4 * freqScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(s => s.ball);

    return { topNModel, topNFreq, intersection, combined };
  }, [snapshot, n]);

  if (!result || snapshot.periods.length === 0) {
    return (
      <div className="panel p-4 text-sm text-ink-muted">
        Need ≥1 period to auto-pick.
      </div>
    );
  }

  const pickMap: Record<AutoMode, { balls: number[]; label: string; desc: string }> = {
    combine: { balls: result.combined, label: t('autoPick.combine'), desc: '60% model + 40% frequency' },
    intersection: { balls: result.intersection, label: t('autoPick.intersection'), desc: 'In both Top-N lists' },
    model: { balls: result.topNModel, label: t('autoPick.model'), desc: 'Bayesian L2 only' },
    frequency: { balls: result.topNFreq, label: t('autoPick.frequency'), desc: 'Raw count ranking' },
  };

  return (
    <div className="panel p-4">
      <div className="h-row mb-3">
        <h3 className="label">{t('autoPick.title')}</h3>
        <span className="text-[10px] text-ink-muted num">{t('autoPick.tag')}</span>
      </div>

      <div className="flex gap-1 mb-3">
        {(Object.keys(pickMap) as AutoMode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`
              flex-1 px-2 py-1.5 text-[11px] rounded border transition
              ${mode === m
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                : 'bg-bg-raised border-line-default text-ink-secondary hover:border-line-strong'
              }
            `}
          >
            {pickMap[m].label}
          </button>
        ))}
      </div>

      <div className="panel-raised p-3 mb-3">
        <div className="text-[10px] text-ink-muted mb-1.5">{pickMap[mode].desc}</div>
        <div className="flex flex-wrap gap-1">
          {pickMap[mode].balls.map(ball => (
            <span
              key={ball}
              className="num text-xs px-1.5 py-0.5 bg-bg-base border border-line-default rounded text-ink-primary"
            >
              {String(ball).padStart(2, '0')}
            </span>
          ))}
          {pickMap[mode].balls.length === 0 && (
            <span className="text-[10px] text-ink-dim italic">(empty — try a different mode)</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPick(pickMap[mode].balls)}
        disabled={pickMap[mode].balls.length === 0}
        className="
          w-full px-3 py-2 rounded text-xs font-medium
          bg-emerald-500/15 border border-emerald-500/40 text-emerald-200
          hover:bg-emerald-500/25 transition
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        Apply {pickMap[mode].label} picks
      </button>

      <p className="text-[10px] text-ink-muted mt-2 leading-relaxed">{t('autoPick.note')}</p>
    </div>
  );
}