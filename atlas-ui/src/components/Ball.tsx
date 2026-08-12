import type { ReactNode } from 'react';

interface Props {
  rank: number;
  value: number;
  tier?: 'top' | 'mid' | 'normal';
  delayMs?: number;
  footer?: ReactNode;
}

const TIER_RING: Record<NonNullable<Props['tier']>, string> = {
  top: 'ring-2 ring-amber-400/70 shadow-[0_0_16px_-3px_rgba(251,191,36,0.6)]',
  mid: 'ring-1 ring-emerald-500/40',
  normal: 'ring-1 ring-line-default',
};

export function Ball({ rank, value, tier = 'normal', delayMs = 0, footer }: Props) {
  return (
    <div
      className="panel-raised p-2 flex flex-col items-center gap-1 animate-fade-in"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="text-[10px] text-ink-dim num">#{rank}</span>
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center num font-semibold text-sm text-ink-primary bg-gradient-to-b from-bg-overlay to-bg-raised ${TIER_RING[tier]}`}
      >
        {value}
      </span>
      {footer}
    </div>
  );
}
