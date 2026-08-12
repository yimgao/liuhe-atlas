import { useMemo, useState } from 'react';

interface Props {
  count: number;
}

const PRESET_COUNTS = [1, 5, 10, 20, 30, 40];
const TOTAL_BALLS = 49;

interface Row {
  n: number;
  cost: number;
  hitProbability: number;
  expectedReturn: number;
  expectedNet: number;
  edgePercent: number;
}

function computeRow(n: number, stake: number, payout: number): Row {
  const cost = stake * n;
  const hitProbability = n / TOTAL_BALLS;
  const expectedReturn = payout * hitProbability;
  const expectedNet = expectedReturn - cost;
  const edgePercent = cost > 0 ? (expectedNet / cost) * 100 : 0;
  return { n, cost, hitProbability, expectedReturn, expectedNet, edgePercent };
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function PayoutCalculator({ count }: Props) {
  const [stake, setStake] = useState(10);
  const [payout, setPayout] = useState(470);

  const rows = useMemo(() => {
    const ns = Array.from(new Set([...PRESET_COUNTS, count])).sort((a, b) => a - b);
    return ns.map((n) => computeRow(n, stake, payout));
  }, [count, stake, payout]);

  const current = useMemo(() => computeRow(count, stake, payout), [count, stake, payout]);
  const breakEvenPayout = stake * TOTAL_BALLS;

  return (
    <div className="panel p-4 space-y-3">
      <div className="h-row flex-wrap gap-y-2">
        <span className="label">投注期望值计算器</span>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-ink-muted">单注金额</span>
            <input
              type="number"
              min={0}
              value={stake}
              onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
              className="w-16 px-2 py-1 rounded bg-bg-raised border border-line-default text-ink-primary num text-right"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-ink-muted">中奖派彩</span>
            <input
              type="number"
              min={0}
              value={payout}
              onChange={(e) => setPayout(Math.max(0, Number(e.target.value)))}
              className="w-16 px-2 py-1 rounded bg-bg-raised border border-line-default text-ink-primary num text-right"
            />
          </label>
        </div>
      </div>

      <div
        className={`rounded border px-3 py-2 text-[11px] leading-relaxed ${
          current.edgePercent < 0
            ? 'border-warn-border bg-warn-bg text-warn-text'
            : 'border-prob-high/40 bg-prob-high/10 text-prob-high'
        }`}
      >
        当前选 <span className="num">{count}</span> 个号码：成本 ¥
        <span className="num">{current.cost.toFixed(0)}</span> · 中奖概率{' '}
        <span className="num">{(current.hitProbability * 100).toFixed(1)}%</span> · 期望净值{' '}
        <span className="num">{formatSigned(current.expectedNet)}</span> 元（相当于赔率{' '}
        <span className="num">{current.edgePercent.toFixed(2)}%</span>）。盈亏平衡派彩应为 ¥
        <span className="num">{breakEvenPayout.toFixed(0)}</span>。
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] num">
          <thead>
            <tr className="text-ink-dim text-left">
              <th className="py-1 pr-3 font-normal">N</th>
              <th className="py-1 pr-3 font-normal">成本</th>
              <th className="py-1 pr-3 font-normal">中奖概率</th>
              <th className="py-1 pr-3 font-normal">期望回报</th>
              <th className="py-1 pr-3 font-normal">期望净值</th>
              <th className="py-1 font-normal">相当赔率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.n}
                className={`border-t border-line-subtle ${
                  row.n === count ? 'text-ink-primary bg-bg-raised/60' : 'text-ink-secondary'
                }`}
              >
                <td className="py-1 pr-3">{row.n}</td>
                <td className="py-1 pr-3">¥{row.cost.toFixed(0)}</td>
                <td className="py-1 pr-3">{(row.hitProbability * 100).toFixed(1)}%</td>
                <td className="py-1 pr-3">¥{row.expectedReturn.toFixed(2)}</td>
                <td className="py-1 pr-3">{formatSigned(row.expectedNet)}</td>
                <td className="py-1">{row.edgePercent.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-ink-dim leading-relaxed border-t border-line-subtle pt-2">
        无论选择哪些号码、选多少个，每一注的期望赔付比例都相同——这是由赔率结构决定的，不受历史数据或选号策略影响。增加 N
        只会同比例放大成本与期望损失，不会改变赔率本身。
      </p>
    </div>
  );
}
