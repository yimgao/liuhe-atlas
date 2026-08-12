import { useState } from 'react';
import type { RecommendationItem } from '../types';
import { Ball } from './Ball';

interface Props {
  recommendations: RecommendationItem[];
}

function tierFor(rank: number): 'top' | 'mid' | 'normal' {
  if (rank <= 3) return 'top';
  if (rank <= 10) return 'mid';
  return 'normal';
}

export function RecommendationGrid({ recommendations }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = recommendations.map((r) => r.ball).join(', ');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (recommendations.length === 0) {
    return (
      <div className="panel p-6 text-center text-sm text-ink-muted">
        暂无推荐结果
      </div>
    );
  }

  return (
    <div className="panel p-4 space-y-3">
      <div className="h-row">
        <span className="label">推荐排名（共 {recommendations.length} 个）</span>
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 rounded text-xs font-medium bg-bg-raised border border-line-default text-ink-secondary hover:border-line-strong transition"
        >
          {copied ? '已复制' : '复制推荐号码'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {recommendations.map((r) => (
          <Ball
            key={r.rank}
            rank={r.rank}
            value={r.ball}
            tier={tierFor(r.rank)}
            delayMs={Math.min(r.rank - 1, 24) * 20}
            footer={
              <>
                <span className="text-[11px] text-prob-high num">
                  {(r.estimated_probability * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-ink-muted num">
                  历史 {r.historical_count} 次
                </span>
                <span className="text-[10px] text-ink-dim num">
                  间隔 {r.gap_draws ?? '—'}
                </span>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
