import { useEffect, useMemo, useState } from 'react';
import type { Snapshot, SelectionMode } from './types';
import { predict, selectBalls } from './lib/predictor';
import { setYearlyZodiacMaps } from './lib/symbolMaps';
import { analyzeCoverage } from './lib/coverage';
import { backtest } from './lib/backtest';
import { useLocale } from './lib/i18n';

import { DisclaimerBanner } from './components/DisclaimerBanner';
import { DataStatusBar } from './components/DataStatusBar';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { CountdownTimer } from './components/CountdownTimer';
import { Controls } from './components/Controls';
import { BallGrid } from './components/BallGrid';
import { RecommendationPanel } from './components/RecommendationPanel';
import { CoverageAnalyzer } from './components/CoverageAnalyzer';
import { BacktestChart } from './components/BacktestChart';
import { ExpectedLossCard } from './components/ExpectedLossCard';
import { WinProbabilityCard } from './components/WinProbabilityCard';
import { NumberFrequencySparkline } from './components/NumberFrequencySparkline';
import { SymbolDimensionHeatmap } from './components/SymbolDimensionHeatmap';
import { SymbolDimensionBreakdown } from './components/SymbolDimensionBreakdown';
import { StrategyComparison } from './components/StrategyComparison';
import { UniformityCheck } from './components/UniformityCheck';
import { RollingWindowBacktest } from './components/RollingWindowBacktest';
import { AutoPick } from './components/AutoPick';
import { ExportReport } from './components/ExportReport';
import { CopyNumbersWithMeta } from './components/CopyNumbersWithMeta';

const COST_PER_PERIOD = 1;
const TARGET_YEAR = 2026;

export default function App() {
  const { t } = useLocale();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SelectionMode>('top-n');
  const [n, setN] = useState(20);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadSnapshot = async () => {
    try {
      const res = await fetch('/data/snapshot.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Snapshot = await res.json();
      if (data.zodiac_maps) {
        setYearlyZodiacMaps(data.zodiac_maps as any);
      }
      setSnapshot(data);
      setError(null);
    } catch (e: any) {
      setError(`Failed to load snapshot: ${e.message}`);
    }
  };

  useEffect(() => {
    loadSnapshot();
    const interval = setInterval(loadSnapshot, 60_000);
    return () => clearInterval(interval);
  }, []);

  const prediction = useMemo(() => {
    if (!snapshot) return null;
    return predict(snapshot, TARGET_YEAR);
  }, [snapshot]);

  const recommended = useMemo(() => {
    if (!prediction) return [] as number[];
    return selectBalls(prediction.ranked, mode, n);
  }, [prediction, mode, n]);

  const coverage = useMemo(() => {
    return analyzeCoverage(Array.from(selected), TARGET_YEAR);
  }, [selected]);

  const backtestResult = useMemo(() => {
    if (!snapshot || snapshot.periods.length < 2) return null;
    try {
      return backtest(
        snapshot,
        { mode, n, payout_per_unit: 45, cost_per_unit: COST_PER_PERIOD },
        (historySoFar) => {
          const latestYear = Math.max(
            ...historySoFar.periods.map(p => Math.floor(p.period_id / 1000)),
            TARGET_YEAR
          );
          const pred = predict(historySoFar, latestYear);
          return selectBalls(pred.ranked, mode, n);
        },
      );
    } catch {
      return null;
    }
  }, [snapshot, mode, n]);

  const handleToggle = (ball: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ball)) next.delete(ball);
      else if (next.size < 45) next.add(ball);
      return next;
    });
  };

  const handleApplyRecommendation = () => setSelected(new Set(recommended));
  const handleReset = () => setSelected(new Set());

  const handleAutoPick = (balls: number[]) => setSelected(new Set(balls));

  if (error) {
    return (
      <div className="min-h-screen bg-bg-base text-ink-primary p-8">
        <DisclaimerBanner />
        <div className="max-w-2xl mx-auto mt-12 panel p-6">
          <h1 className="text-lg font-semibold text-red-400 mb-2">{t('error.loadFailed')}</h1>
          <p className="text-sm text-ink-secondary mb-4">{error}</p>
          <p className="text-xs text-ink-muted">{t('error.loadHint')}</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-ink-muted text-sm">{t('error.loading')}</div>
      </div>
    );
  }

  const totalSelected = Math.max(selected.size, n);

  return (
    <div className="min-h-screen bg-bg-base">
      <DisclaimerBanner />

      <header className="border-b border-line-subtle">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink-primary">
              {t('app.title')}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {t('app.subtitle')} · <span className="num">{snapshot.periods.length}</span> periods ingested
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <CopyNumbersWithMeta snapshot={snapshot} selected={Array.from(selected)} />
            <ExportReport snapshot={snapshot} selected={Array.from(selected)} mode={mode} n={n} />
            <button
              type="button"
              onClick={loadSnapshot}
              className="
                px-3 py-1.5 rounded text-xs font-medium
                bg-bg-raised border border-line-default text-ink-secondary
                hover:border-line-strong transition
              "
            >
              {t('app.refreshData')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <DataStatusBar snapshot={snapshot} prediction={prediction} />

        {/* Countdown + quick actions */}
        <CountdownTimer onRefresh={loadSnapshot} />

        {/* Row 1: Controls (left) + Grid + Coverage (center) + Ranking (right) */}
        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <Controls
              mode={mode}
              onChange={setMode}
              n={n}
              onNChange={setN}
              selectedCount={selected.size}
              onApplyRecommendation={handleApplyRecommendation}
              onReset={handleReset}
            />
            <AutoPick snapshot={snapshot} n={n} onPick={handleAutoPick} />
            <WinProbabilityCard selectedCount={totalSelected} />
            <ExpectedLossCard
              selectedCount={totalSelected}
              costPerPeriod={COST_PER_PERIOD}
            />
          </aside>

          <section className="col-span-12 lg:col-span-5 space-y-4">
            <BallGrid
              selected={selected}
              onToggle={handleToggle}
              topN={prediction?.ranked.slice(0, n).map(r => r.ball) ?? []}
              coverN={prediction?.ranked.slice(49 - n).map(r => r.ball) ?? []}
              mode={mode}
              year={TARGET_YEAR}
            />
            <CoverageAnalyzer
              coverage={coverage}
              selectedCount={selected.size}
              totalCount={Math.max(n, 1)}
            />
          </section>

          <section className="col-span-12 lg:col-span-4">
            <RecommendationPanel
              prediction={prediction}
              selected={Array.from(selected)}
              year={TARGET_YEAR}
            />
          </section>
        </div>

        {/* Row 2: Strategy + Rolling */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <StrategyComparison snapshot={snapshot} n={n} />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <RollingWindowBacktest snapshot={snapshot} n={n} />
          </div>
        </div>

        <BacktestChart
          backtest={backtestResult}
          expectedUniformRate={n / 49}
        />

        {/* Row 3: Statistical depth */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4">
            <NumberFrequencySparkline snapshot={snapshot} />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <SymbolDimensionHeatmap snapshot={snapshot} limit={12} />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <UniformityCheck snapshot={snapshot} />
          </div>
        </div>

        {/* Row 4: Dimension breakdown (NEW) */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <SymbolDimensionBreakdown snapshot={snapshot} />
          </div>
        </div>

        <footer className="text-center text-[10px] text-ink-dim py-6">
          {t('footer.disclaimer')}
          <br />
          {t('footer.lastBuild')}
        </footer>
      </main>
    </div>
  );
}