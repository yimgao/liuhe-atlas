import type { LatestDrawInfo } from '../types';

interface Props {
  latestDraw: LatestDrawInfo | null;
  generatedAt: string | null;
}

export function Header({ latestDraw, generatedAt }: Props) {
  return (
    <header className="border-b border-line-subtle relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(16,185,129,0.12), transparent 45%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {latestDraw && (
            <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center num font-bold text-base text-ink-primary bg-gradient-to-b from-bg-overlay to-bg-raised ring-2 ring-emerald-400/60 shadow-[0_0_16px_-3px_rgba(16,185,129,0.6)]">
              {latestDraw.special_number}
            </span>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              六合图谱 · 特别号推荐
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {latestDraw ? (
                <>
                  最新期号 <span className="num">{latestDraw.period_id}</span> · 开奖日期{' '}
                  <span className="num">{latestDraw.draw_date}</span> · 特别号{' '}
                  <span className="num">{latestDraw.special_number}</span>
                </>
              ) : (
                '暂无历史开奖数据'
              )}
            </p>
          </div>
        </div>
        {generatedAt && (
          <p className="text-[10px] text-ink-dim num">
            更新时间 {new Date(generatedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </header>
  );
}
