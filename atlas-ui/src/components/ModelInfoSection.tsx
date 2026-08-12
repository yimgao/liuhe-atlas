import type { BacktestResponse, ModelInfo } from '../types';

interface Props {
  model: ModelInfo;
  sampleCount: number;
  dataQuality: 'ok' | 'insufficient_history';
  warning: string | null;
  disclaimer: string;
  backtest: BacktestResponse | null;
}

export function ModelInfoSection({
  model,
  sampleCount,
  dataQuality,
  warning,
  disclaimer,
  backtest,
}: Props) {
  return (
    <div className="panel p-4 space-y-3 text-xs text-ink-secondary">
      <div className="h-row flex-wrap gap-y-2">
        <span className="label">模型信息</span>
        <span className="num">
          {model.name} v{model.version} · alpha={model.alpha} · 样本数{' '}
          {sampleCount}
        </span>
      </div>

      {dataQuality === 'insufficient_history' && warning && (
        <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-warn-text text-[11px]">
          ⚠ {warning}
        </div>
      )}

      {backtest && (
        <div className="border-t border-line-subtle pt-3">
          <p className="text-[11px] leading-relaxed">
            回测样本外测试期数：<span className="num">{backtest.test_period_count}</span>
          </p>
          <p className="text-[11px] leading-relaxed mt-1">{backtest.summary}</p>
        </div>
      )}

      <div className="border-t border-warn-border/40 pt-3 text-warn-text text-[11px] leading-relaxed">
        {disclaimer}
      </div>
    </div>
  );
}
