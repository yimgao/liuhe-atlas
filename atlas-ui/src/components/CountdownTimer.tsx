import { useEffect, useState } from 'react';
import { useLocale } from '../lib/i18n';

interface Props {
  onRefresh: () => void;
}

/**
 * Countdown to next Macau draw (21:32 daily) + next fetcher cron run.
 * When close to draw time, encourages user to refresh.
 *
 * Uses ms timestamps (numbers) throughout to avoid Date/number confusion.
 */
export function CountdownTimer({ onRefresh }: Props) {
  const { t } = useLocale();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Compute ms to next 21:32 draw
  function nextOccurrenceMs(hour: number, minute: number, fromMs: number): number {
    const d = new Date(fromMs);
    const target = new Date(d);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  const nextDrawMs = nextOccurrenceMs(21, 32, nowMs);
  const nextCronMs = nextOccurrenceMs(21, 35, nowMs);

  const drawRemaining = Math.max(0, nextDrawMs - nowMs);
  const cronRemaining = Math.max(0, nextCronMs - nowMs);

  const fmt = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // When ≤ 10 min to next draw, flash a "refresh now" hint
  const drawUrgent = drawRemaining > 0 && drawRemaining < 10 * 60 * 1000;

  return (
    <div className={`
      panel p-3 flex items-center justify-between gap-3 text-xs
      ${drawUrgent ? 'border-amber-500/40 bg-amber-500/5' : ''}
    `}>
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <span className="label mr-2">{t('countdown.nextDraw')}</span>
          <span className={`num font-medium ${drawUrgent ? 'text-amber-300' : 'text-emerald-300'}`}>
            {fmt(drawRemaining)}
          </span>
        </div>
        <div>
          <span className="label mr-2">{t('countdown.refreshIn')}</span>
          <span className="num text-ink-secondary">
            {fmt(cronRemaining)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="
          px-3 py-1.5 rounded text-xs font-medium
          bg-emerald-500/15 border border-emerald-500/40 text-emerald-200
          hover:bg-emerald-500/25 transition
        "
      >
        {t('countdown.refreshNow')}
      </button>
    </div>
  );
}