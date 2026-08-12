import { useEffect, useMemo, useState } from 'react';
import { pickRandomBalls } from '../lib/random';
import { Ball } from './Ball';

interface Props {
  count: number;
  modelBalls: number[];
}

export function RandomComparison({ count, modelBalls }: Props) {
  const [balls, setBalls] = useState<number[]>(() => pickRandomBalls(count));

  useEffect(() => {
    setBalls(pickRandomBalls(count));
  }, [count]);

  const overlap = useMemo(
    () => balls.filter((b) => modelBalls.includes(b)).length,
    [balls, modelBalls],
  );

  return (
    <div className="panel p-4 space-y-3">
      <div className="h-row flex-wrap gap-y-2 items-start">
        <div>
          <span className="label">随机对照（共 {balls.length} 个）</span>
          <p className="text-[11px] text-ink-muted mt-1 max-w-md leading-relaxed">
            纯客户端随机生成，不使用任何历史数据。用来直观验证：在公平彩票中，模型排名和随机选号的长期命中率没有统计差异。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBalls(pickRandomBalls(count))}
          className="px-3 py-1.5 rounded text-xs font-medium bg-bg-raised border border-line-default text-ink-secondary hover:border-line-strong transition shrink-0"
        >
          重新生成
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {balls.map((ball, i) => (
          <Ball
            key={`${ball}-${i}`}
            rank={i + 1}
            value={ball}
            delayMs={Math.min(i, 24) * 20}
            footer={<span className="text-[10px] text-ink-muted num">随机</span>}
          />
        ))}
      </div>
      {modelBalls.length > 0 && (
        <p className="text-[11px] text-ink-muted border-t border-line-subtle pt-2">
          与模型推荐重合 <span className="num text-ink-secondary">{overlap}</span> 个 ——
          两组号码彼此独立生成，重合数量本身不代表任何优势。
        </p>
      )}
    </div>
  );
}
