import { useEffect, useMemo, useState } from 'react';
import { dailyBallOrder, localDateKey, msUntilNextLocalMidnight } from '../lib/random';
import { Ball } from './Ball';

interface Props {
  count: number;
  modelBalls: number[];
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function DailyPick({ count, modelBalls }: Props) {
  const [dateKey, setDateKey] = useState(() => localDateKey());
  const [countdown, setCountdown] = useState(() => msUntilNextLocalMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(msUntilNextLocalMidnight());
      const today = localDateKey();
      setDateKey((prev) => (prev === today ? prev : today));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const order = useMemo(() => dailyBallOrder(dateKey), [dateKey]);
  const balls = order.slice(0, count);

  const overlap = useMemo(
    () => balls.filter((b) => modelBalls.includes(b)).length,
    [balls, modelBalls],
  );

  return (
    <div className="panel p-4 space-y-3">
      <div className="h-row flex-wrap gap-y-2 items-start">
        <div>
          <span className="label">今日幸运号（共 {balls.length} 个）</span>
          <p className="text-[11px] text-ink-muted mt-1 max-w-md leading-relaxed">
            按当天日期固定生成，全天不变，明天 00:00 自动换一批。纯随机，不使用任何历史数据，不代表任何预测优势。
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-ink-dim">距下次更新</div>
          <div className="num text-sm text-ink-secondary">{formatCountdown(countdown)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {balls.map((ball, i) => (
          <Ball
            key={`${ball}-${i}`}
            rank={i + 1}
            value={ball}
            delayMs={Math.min(i, 24) * 20}
            footer={<span className="text-[10px] text-ink-muted num">今日</span>}
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
