import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLatestBacktest, fetchRecommendations } from './lib/data';
import type { BacktestResponse, RecommendationsResponse } from './types';
import { Header } from './components/Header';
import { CountSelector } from './components/CountSelector';
import { RecommendationGrid } from './components/RecommendationGrid';
import { ModelInfoSection } from './components/ModelInfoSection';
import { StrategyTabs, type Mode } from './components/StrategyTabs';
import { DailyPick } from './components/DailyPick';
import { PayoutCalculator } from './components/PayoutCalculator';

const DEFAULT_COUNT = 20;

export default function App() {
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [mode, setMode] = useState<Mode>('model');
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modelBalls = useMemo(
    () => data?.recommendations.map((r) => r.ball) ?? [],
    [data],
  );

  const load = useCallback(async (n: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRecommendations(n);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(count);
  }, [count, load]);

  useEffect(() => {
    fetchLatestBacktest()
      .then(setBacktest)
      .catch(() => setBacktest(null));
  }, []);

  return (
    <div className="min-h-screen bg-bg-base">
      <Header
        latestDraw={data?.latest_draw ?? null}
        generatedAt={data?.generated_at ?? null}
      />

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <CountSelector value={count} onChange={setCount} />

        {error && (
          <div className="panel p-6 text-center space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => load(count)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-bg-raised border border-line-default text-ink-secondary hover:border-line-strong transition"
            >
              重试
            </button>
          </div>
        )}

        {!error && loading && !data && (
          <div className="panel p-6 text-center text-sm text-ink-muted">加载中…</div>
        )}

        {!error && data && (
          <>
            {data.recommendations.length < data.requested_count && (
              <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-warn-text text-[11px]">
                ⚠ 仅返回 {data.recommendations.length} / {data.requested_count} 个推荐结果
              </div>
            )}
            <StrategyTabs mode={mode} onChange={setMode} />
            {mode === 'model' ? (
              <RecommendationGrid recommendations={data.recommendations} />
            ) : (
              <DailyPick count={count} modelBalls={modelBalls} />
            )}
            <PayoutCalculator count={count} />
            <ModelInfoSection
              model={data.model}
              sampleCount={data.sample_count}
              dataQuality={data.data_quality}
              warning={data.warning}
              disclaimer={data.disclaimer}
              backtest={backtest}
            />
          </>
        )}
      </main>
    </div>
  );
}
