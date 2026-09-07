/**
 * i18n — Internationalization for Atlas UI.
 * Locale state is a module-level singleton, so all useLocale() calls share state.
 */
import { useCallback, useEffect, useState } from 'react';

export type Locale = 'zh-CN' | 'en';

const STORAGE_KEY = 'atlas-locale';

export const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'en'];

export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  'zh-CN': { native: '中文', english: 'Chinese' },
  'en': { native: 'English', english: 'English' },
};

// Module-level singleton state
let _locale: Locale = (() => {
  if (typeof window === 'undefined') return 'zh-CN';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh-CN' || stored === 'en') return stored;
  return 'zh-CN';
})();

const _subscribers = new Set<() => void>();

function setLocaleGlobal(l: Locale) {
  if (_locale === l) return;
  _locale = l;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l === 'zh-CN' ? 'zh-CN' : 'en';
  }
  _subscribers.forEach(fn => fn());
}

// Translation tables
type TKey =
  | 'app.title' | 'app.subtitle' | 'app.copyNumbers' | 'app.refreshData'
  | 'disclaimer.tag' | 'disclaimer.title' | 'disclaimer.body'
  | 'status.data' | 'status.draws' | 'status.updated' | 'status.model' | 'status.signal'
  | 'status.signalNoSignal' | 'status.signalWeak' | 'status.signalModerate' | 'status.signalStrong'
  | 'status.mixedWarning'
  | 'controls.mode' | 'controls.modeTopN' | 'controls.modeTopNDesc' | 'controls.modeCoverN' | 'controls.modeCoverNDesc'
  | 'controls.count' | 'controls.apply' | 'controls.reset' | 'controls.selectedCount' | 'controls.ballsUnit'
  | 'grid.title' | 'grid.yearSuffix' | 'grid.legend' | 'grid.recommended' | 'grid.selected'
  | 'coverage.title' | 'coverage.selectedCount' | 'coverage.ofTotal'
  | 'coverage.zodiac' | 'coverage.wuxing' | 'coverage.wave' | 'coverage.odd' | 'coverage.even'
  | 'ranked.title' | 'ranked.maxProb' | 'ranked.uniformProb'
  | 'ranked.column.rank' | 'ranked.column.ball' | 'ranked.column.symbol' | 'ranked.column.prob' | 'ranked.column.density'
  | 'ranked.loading'
  | 'backtest.title' | 'backtest.placeholder'
  | 'backtest.hitRate' | 'backtest.vsUniform' | 'backtest.lift' | 'backtest.overUniform'
  | 'backtest.roi' | 'backtest.overBacktest' | 'backtest.cumPL' | 'backtest.onBets'
  | 'backtest.hitsAndMisses' | 'backtest.caveat'
  | 'loss.title' | 'loss.tag' | 'loss.payout' | 'loss.perYear' | 'loss.years'
  | 'loss.totalStake' | 'loss.expectedPayout' | 'loss.expectedPL' | 'loss.roi'
  | 'loss.warningBad' | 'loss.warningModerate' | 'loss.warningSlight' | 'loss.warningFair' | 'loss.warningUnfair'
  | 'winprob.title' | 'winprob.tag' | 'winprob.pAny' | 'winprob.pSpecial'
  | 'winprob.pAnyExplain' | 'winprob.pSpecialExplain' | 'winprob.formula' | 'winprob.ballsSelected' | 'winprob.note'
  | 'freq.title' | 'freq.tag' | 'freq.subtitle' | 'freq.uniformExpected' | 'freq.actual' | 'freq.deviation' | 'freq.zscore' | 'freq.chiSquare'
  | 'heatmap.title' | 'heatmap.tag' | 'heatmap.subtitle' | 'heatmap.row' | 'heatmap.colZodiac' | 'heatmap.colWuxing' | 'heatmap.colWave'
  | 'strategy.title' | 'strategy.tag' | 'strategy.topN' | 'strategy.coverN' | 'strategy.uniform' | 'strategy.topNDesc' | 'strategy.coverNDesc' | 'strategy.uniformDesc' | 'strategy.winner' | 'strategy.needMoreData'
  | 'rolling.title' | 'rolling.tag' | 'rolling.last30' | 'rolling.last90' | 'rolling.full' | 'rolling.cumulative' | 'rolling.note'
  | 'uniformCheck.title' | 'uniformCheck.tag' | 'uniformCheck.pValue' | 'uniformCheck.rejectNull' | 'uniformCheck.failToReject' | 'uniformCheck.zodiacTest' | 'uniformCheck.wuxingTest' | 'uniformCheck.waveTest' | 'uniformCheck.note'
  | 'breakdown.title' | 'breakdown.tag' | 'breakdown.zodiac' | 'breakdown.wuxing' | 'breakdown.wave' | 'breakdown.uniform' | 'breakdown.lift' | 'breakdown.note'
  | 'theme.dark' | 'theme.light' | 'theme.toggle'
  | 'export.pdf' | 'export.report' | 'export.generated' | 'export.disclaimer'
  | 'autoPick.title' | 'autoPick.tag' | 'autoPick.combine' | 'autoPick.intersection' | 'autoPick.frequency' | 'autoPick.model' | 'autoPick.note'
  | 'countdown.nextDraw' | 'countdown.refreshIn' | 'countdown.refreshNow'
  | 'footer.disclaimer' | 'footer.lastBuild'
  | 'error.loadFailed' | 'error.loadHint' | 'error.loading';

export const TRANSLATIONS: Record<Locale, Record<TKey, string>> = {
  'zh-CN': {
    'app.title': '六合图谱 · Atlas',
    'app.subtitle': '澳门六合彩 · 统计分析研究项目',
    'app.copyNumbers': '复制号码',
    'app.refreshData': '刷新数据',
    'disclaimer.tag': '模拟模式 · 非投注建议',
    'disclaimer.title': '⚠️',
    'disclaimer.body': '本工具基于历史数据用贝叶斯聚合输出概率分布。这是统计学习项目，不是预测服务。真实开奖是 i.i.d. 均匀随机 —— 长期期望 ROI 必为负，不受模型输出影响。不提供也不支持任何真实下注。详见下方"Expected loss"小组件。',
    'status.data': '数据',
    'status.draws': '开奖号码',
    'status.updated': '更新时间',
    'status.model': '模型',
    'status.signal': '信号强度',
    'status.signalNoSignal': '无信号',
    'status.signalWeak': '弱',
    'status.signalModerate': '中',
    'status.signalStrong': '强',
    'status.mixedWarning': '混合数据源: {real} 真实 + {synthetic} 合成 — 合成期仅用于 UI 演示，回测结果仅供示意。',
    'controls.mode': '选择模式',
    'controls.modeTopN': 'Top-N',
    'controls.modeTopNDesc': '推荐 N 个号码',
    'controls.modeCoverN': 'Cover-N',
    'controls.modeCoverNDesc': '排除最低 N 个',
    'controls.count': '选号数量',
    'controls.apply': '应用推荐',
    'controls.reset': '重置',
    'controls.selectedCount': '当前已选',
    'controls.ballsUnit': '个号码',
    'grid.title': '49 球网格',
    'grid.yearSuffix': '年',
    'grid.legend': '背景色 = 五行 · 文字色 = 波色',
    'grid.recommended': '推荐',
    'grid.selected': '已选',
    'coverage.title': '符号覆盖',
    'coverage.selectedCount': '已选',
    'coverage.ofTotal': ' / ',
    'coverage.zodiac': '生肖',
    'coverage.wuxing': '五行',
    'coverage.wave': '波色',
    'coverage.odd': '单',
    'coverage.even': '双',
    'ranked.title': '概率排名',
    'ranked.maxProb': '最高',
    'ranked.uniformProb': '均匀',
    'ranked.column.rank': '排名',
    'ranked.column.ball': '球号',
    'ranked.column.symbol': '符号',
    'ranked.column.prob': '概率',
    'ranked.column.density': '密度',
    'ranked.loading': '加载中…',
    'backtest.title': '历史回测',
    'backtest.placeholder': '回测需要至少 2 期历史数据。当前: {n} 期。',
    'backtest.hitRate': '命中率',
    'backtest.vsUniform': '对照均匀 {pp}%',
    'backtest.lift': 'Lift 提升',
    'backtest.overUniform': '相对均匀',
    'backtest.roi': 'ROI',
    'backtest.overBacktest': '回测区间',
    'backtest.cumPL': '累计盈亏',
    'backtest.onBets': '基于 {n} 注',
    'backtest.hitsAndMisses': '{hits} 中 · {misses} 不中',
    'backtest.caveat': '⚠ 回测使用 prior 期（无未来泄露）。样本少，结果无统计显著性，仅供示意，不可作为预测。',
    'loss.title': '期望亏损模拟器',
    'loss.tag': '诚实数学 · 诚实数学',
    'loss.payout': '派彩 (×)',
    'loss.perYear': '每年期数',
    'loss.years': '年数',
    'loss.totalStake': '总投注',
    'loss.expectedPayout': '期望回报',
    'loss.expectedPL': '期望盈亏',
    'loss.roi': 'ROI',
    'loss.warningBad': '诚实假设下，{years} 年内你会损失超过一半本金。',
    'loss.warningModerate': '数学告诉你 {years} 年内你会亏掉约 {pct}% 本金。',
    'loss.warningSlight': '期望轻微亏损约 {pct}% / {years} 年。',
    'loss.warningFair': '接近公平 — 但请注意庄家抽水会让"看起来公平"实际必亏。',
    'loss.warningUnfair': '数学上正期望 — 但仅当派彩({payout}) > 1/(N/49)={fair} 时。真实私彩几乎不可能达到。',
    'winprob.title': '赢的概率',
    'winprob.tag': '至少中一球 vs 中特码',
    'winprob.pAny': '至少中 1 球',
    'winprob.pSpecial': '中特码 (第 7 球)',
    'winprob.pAnyExplain': '假设 7 球独立采样，选 N 个号码时至少中 1 球的概率。',
    'winprob.pSpecialExplain': '选 N 个号码，命中第 7 球（特码）的概率，按均匀 i.i.d. 假设。',
    'winprob.formula': '公式',
    'winprob.ballsSelected': '已选 {n} 个',
    'winprob.note': '⚠ 真实胜率 ≤ 1/49 = 2.04%，与 N 无关（数学铁律）。上面显示的是不同口径的概率。',
    'freq.title': '49 球频率分布',
    'freq.tag': '每球出现次数 + 偏差分析',
    'freq.subtitle': '基于历史数据的 49 球出现频率，按球号排序。',
    'freq.uniformExpected': '均匀期望',
    'freq.actual': '实际',
    'freq.deviation': '偏差',
    'freq.zscore': 'Z 分数',
    'freq.chiSquare': '卡方检验',
    'heatmap.title': '符号维度频次热图',
    'heatmap.tag': '12 生肖 × 7 期 × 5 五行 × 3 波色',
    'heatmap.subtitle': '每个 cell = 该 symbol 在该期出现了几次。颜色越深 → 出现越多。',
    'heatmap.row': '期号',
    'heatmap.colZodiac': '生肖',
    'heatmap.colWuxing': '五行',
    'heatmap.colWave': '波色',
    'strategy.title': '策略对比',
    'strategy.tag': 'Top-N vs Cover-N vs 随机 — 哪个赢最多？',
    'strategy.topN': 'Top-N 模型',
    'strategy.coverN': 'Cover-N 排除',
    'strategy.uniform': '随机基准',
    'strategy.topNDesc': '选模型认为最可能中的 N 个',
    'strategy.coverNDesc': '排除模型认为最不可能的 N 个',
    'strategy.uniformDesc': '任意选 N 个（无信息）',
    'strategy.winner': '当前最佳策略',
    'strategy.needMoreData': '需要 ≥2 期才能对比',
    'rolling.title': '滑动窗口回测',
    'rolling.tag': '最近 30 期 vs 最近 90 期 vs 全期',
    'rolling.last30': '最近 30 期',
    'rolling.last90': '最近 90 期',
    'rolling.full': '全期',
    'rolling.cumulative': '累计命中',
    'rolling.note': '⚠ 小窗口样本少，命中率噪声大；全期数据更具统计意义。',
    'uniformCheck.title': '均匀性检验',
    'uniformCheck.tag': '卡方检验 + 显著度',
    'uniformCheck.pValue': 'p 值',
    'uniformCheck.rejectNull': '拒绝均匀假设 (p<0.05)',
    'uniformCheck.failToReject': '未拒绝均匀假设',
    'uniformCheck.zodiacTest': '生肖 (12 类)',
    'uniformCheck.wuxingTest': '五行 (5 类)',
    'uniformCheck.waveTest': '波色 (3 类)',
    'uniformCheck.note': '⚠ p<0.05 表示统计显著偏离均匀分布 (庄家 RNG 有偏)。实际私彩通常 p>0.05 (i.i.d. 均匀)。',
    'breakdown.title': '符号维度对比',
    'breakdown.tag': '12 生肖 / 5 五行 / 3 波色 — 哪个区分度最高？',
    'breakdown.zodiac': '生肖',
    'breakdown.wuxing': '五行',
    'breakdown.wave': '波色',
    'breakdown.uniform': '均匀期望',
    'breakdown.lift': '提升',
    'breakdown.note': 'Lift = (实际最高 - 均匀) / 均匀。Lift 越大 → 该维度区分越强 → 模型越能学。',
    'theme.dark': '暗',
    'theme.light': '亮',
    'theme.toggle': '切换主题',
    'export.pdf': '导出 PDF',
    'export.report': '六合图谱 · 分析报告',
    'export.generated': '生成于',
    'export.disclaimer': '本报告基于历史数据统计推断，不构成下注建议。',
    'autoPick.title': '高级自动选号',
    'autoPick.tag': '多信号融合：模型概率 + 历史频率 + 排除法',
    'autoPick.combine': '融合',
    'autoPick.intersection': '交集',
    'autoPick.frequency': '频率',
    'autoPick.model': '模型',
    'autoPick.note': '⚠ 自动选号仍基于不确定的统计信号。长期下注期望仍为负。',
    'countdown.nextDraw': '距下期开奖',
    'countdown.refreshIn': '下次刷新',
    'countdown.refreshNow': '立即刷新',
    'footer.disclaimer': '六合图谱 · Atlas · Bayesian L2 (symbol-aggregated) · 数据源：六合宝典 / 49图库（境外彩票聚合站，非官方监管机构）。',
    'footer.lastBuild': '最后构建: 2026-07-13',
    'error.loadFailed': '数据加载失败',
    'error.loadHint': '请确保已运行 python export_snapshot.py',
    'error.loading': '加载快照中…',
  },
  'en': {
    'app.title': 'liuhe-atlas · Atlas',
    'app.subtitle': 'Statistical-learning artifact for Macau Lottery (澳门)',
    'app.copyNumbers': 'Copy numbers',
    'app.refreshData': 'Refresh data',
    'disclaimer.tag': 'SIMULATION MODE · NOT BETTING ADVICE',
    'disclaimer.title': '⚠️',
    'disclaimer.body': 'This tool uses Bayesian aggregation on historical lottery data to output a probability distribution. It is a statistical-learning artifact, NOT a prediction service. Real lottery draws are i.i.d. uniform random — expected long-term ROI is negative regardless of model output. No actual wagering is enabled or endorsed. See the "Expected loss" widget below for the math.',
    'status.data': 'Data',
    'status.draws': 'draws',
    'status.updated': 'Updated',
    'status.model': 'Model',
    'status.signal': 'Signal',
    'status.signalNoSignal': 'NO SIGNAL',
    'status.signalWeak': 'WEAK',
    'status.signalModerate': 'MODERATE',
    'status.signalStrong': 'STRONG',
    'status.mixedWarning': 'Mixed data source: {real} real + {synthetic} synthetic — synthetic periods are mock data for UI demo. Backtest results are illustrative only.',
    'controls.mode': 'Selection mode',
    'controls.modeTopN': 'Top-N',
    'controls.modeTopNDesc': 'recommend N',
    'controls.modeCoverN': 'Cover-N',
    'controls.modeCoverNDesc': 'avoid bottom N',
    'controls.count': 'Count',
    'controls.apply': 'Apply recommendation',
    'controls.reset': 'Reset',
    'controls.selectedCount': 'Currently selected',
    'controls.ballsUnit': 'balls',
    'grid.title': '49-ball grid',
    'grid.yearSuffix': 'year',
    'grid.legend': 'Background = 五行 · text color = 波色',
    'grid.recommended': 'recommended',
    'grid.selected': 'selected',
    'coverage.title': 'Symbol coverage',
    'coverage.selectedCount': 'selected',
    'coverage.ofTotal': ' / ',
    'coverage.zodiac': 'zodiac',
    'coverage.wuxing': 'wuxing',
    'coverage.wave': 'wave',
    'coverage.odd': 'odd',
    'coverage.even': 'even',
    'ranked.title': 'Ranked probabilities',
    'ranked.maxProb': 'max',
    'ranked.uniformProb': 'uniform',
    'ranked.column.rank': '#',
    'ranked.column.ball': 'ball',
    'ranked.column.symbol': 'symbol',
    'ranked.column.prob': 'prob',
    'ranked.column.density': 'density',
    'ranked.loading': 'Loading prediction…',
    'backtest.title': 'Historical backtest',
    'backtest.placeholder': 'Backtest will populate once ≥2 historical periods are loaded. Currently: {n} periods.',
    'backtest.hitRate': 'Hit rate',
    'backtest.vsUniform': 'vs uniform {pp}%',
    'backtest.lift': 'Lift',
    'backtest.overUniform': 'over uniform',
    'backtest.roi': 'ROI',
    'backtest.overBacktest': 'over backtest',
    'backtest.cumPL': 'Cum P/L',
    'backtest.onBets': 'on {n} bets',
    'backtest.hitsAndMisses': '{hits} hits · {misses} misses',
    'backtest.caveat': '⚠ Backtest uses prior periods only (no future-leak). With limited data, results are not statistically significant — interpret as illustrative, not predictive.',
    'loss.title': 'Expected loss simulator',
    'loss.tag': 'HONEST MATH · HONEST MATH',
    'loss.payout': 'Payout (×)',
    'loss.perYear': 'Per year',
    'loss.years': 'Years',
    'loss.totalStake': 'Total stake',
    'loss.expectedPayout': 'Expected payout',
    'loss.expectedPL': 'Expected P/L',
    'loss.roi': 'ROI',
    'loss.warningBad': 'Under honest assumptions, you\'d lose over half your stake over {years} years.',
    'loss.warningModerate': 'Math says you lose ~{pct}% of stake over {years} years.',
    'loss.warningSlight': 'Expected slight loss (~{pct}%) over {years} years.',
    'loss.warningFair': 'Near-fair — but house rake makes "looks fair" actually negative.',
    'loss.warningUnfair': 'Mathematically positive — but only because payout ({payout}) > 1/(N/49)={fair}. Real lottery payout rarely exceeds this without rakes.',
    'winprob.title': 'Win probability',
    'winprob.tag': 'P(hit ≥ 1) vs P(hit special-ball)',
    'winprob.pAny': 'P(hit ≥ 1)',
    'winprob.pSpecial': 'P(hit special / 7th)',
    'winprob.pAnyExplain': 'Probability of hitting at least 1 of the 7 drawn balls (assuming independent uniform draws).',
    'winprob.pSpecialExplain': 'Probability of the 7th ball (special) being one of your N selected, under uniform i.i.d. assumption.',
    'winprob.formula': 'Formula',
    'winprob.ballsSelected': 'Balls selected: {n}',
    'winprob.note': '⚠ True long-term win rate ≤ 1/49 = 2.04% regardless of N (mathematical certainty). The values above are different probability interpretations.',
    'freq.title': '49-ball frequency distribution',
    'freq.tag': 'count per ball + deviation analysis',
    'freq.subtitle': 'Frequency of each ball across historical periods, sorted by ball number.',
    'freq.uniformExpected': 'uniform',
    'freq.actual': 'actual',
    'freq.deviation': 'dev',
    'freq.zscore': 'z-score',
    'freq.chiSquare': 'chi²',
    'heatmap.title': 'Symbol-dimension frequency heatmap',
    'heatmap.tag': '12 zodiacs × 7 periods × 5 wuxing × 3 waves',
    'heatmap.subtitle': 'Each cell = times that symbol appeared in that period. Darker = more occurrences.',
    'heatmap.row': 'period',
    'heatmap.colZodiac': 'zodiac',
    'heatmap.colWuxing': 'wuxing',
    'heatmap.colWave': 'wave',
    'strategy.title': 'Strategy comparison',
    'strategy.tag': 'Top-N vs Cover-N vs random — which wins most?',
    'strategy.topN': 'Top-N model',
    'strategy.coverN': 'Cover-N exclude',
    'strategy.uniform': 'Random baseline',
    'strategy.topNDesc': 'Pick N balls model thinks most likely',
    'strategy.coverNDesc': 'Exclude N balls model thinks least likely',
    'strategy.uniformDesc': 'Pick any N balls (no info)',
    'strategy.winner': 'Current best strategy',
    'strategy.needMoreData': 'Need ≥2 periods to compare',
    'rolling.title': 'Rolling-window backtest',
    'rolling.tag': 'last 30 vs last 90 vs full',
    'rolling.last30': 'Last 30',
    'rolling.last90': 'Last 90',
    'rolling.full': 'Full',
    'rolling.cumulative': 'cumulative',
    'rolling.note': '⚠ Small windows have high noise; full-history is more statistically meaningful.',
    'uniformCheck.title': 'Uniformity test',
    'uniformCheck.tag': 'chi-square + significance',
    'uniformCheck.pValue': 'p-value',
    'uniformCheck.rejectNull': 'Reject uniform (p<0.05)',
    'uniformCheck.failToReject': 'Fail to reject uniform',
    'uniformCheck.zodiacTest': 'Zodiac (12 cats)',
    'uniformCheck.wuxingTest': 'Wuxing (5 cats)',
    'uniformCheck.waveTest': 'Wave (3 cats)',
    'uniformCheck.note': '⚠ p<0.05 means statistically significant deviation from uniform (biased RNG). Real private lotteries typically p>0.05 (i.i.d. uniform).',
    'breakdown.title': 'Symbol dimension breakdown',
    'breakdown.tag': '12 zodiac / 5 wuxing / 3 wave — which has most discrimination?',
    'breakdown.zodiac': 'Zodiac',
    'breakdown.wuxing': 'Wuxing',
    'breakdown.wave': 'Wave',
    'breakdown.uniform': 'uniform',
    'breakdown.lift': 'lift',
    'breakdown.note': 'Lift = (max actual - uniform) / uniform. Higher lift = stronger discrimination = model learns better.',
    'theme.dark': 'dark',
    'theme.light': 'light',
    'theme.toggle': 'Toggle theme',
    'export.pdf': 'Export PDF',
    'export.report': 'liuhe-atlas · Analysis report',
    'export.generated': 'Generated',
    'export.disclaimer': 'This report is based on statistical inference from historical data, NOT betting advice.',
    'autoPick.title': 'Advanced auto-pick',
    'autoPick.tag': 'Multi-signal: model + frequency + exclusion',
    'autoPick.combine': 'Combine',
    'autoPick.intersection': 'Intersection',
    'autoPick.frequency': 'Frequency',
    'autoPick.model': 'Model',
    'autoPick.note': '⚠ Auto-pick is still based on uncertain statistical signal. Long-term betting EV remains negative.',
    'countdown.nextDraw': 'Next draw',
    'countdown.refreshIn': 'Next refresh',
    'countdown.refreshNow': 'Refresh now',
    'footer.disclaimer': 'liuhe-atlas-ui · Bayesian L2 (symbol-aggregated) · data sourced from 六合宝典 / 49图库 (offshore lottery aggregator, not an official regulator).',
    'footer.lastBuild': 'Last build: 2026-07-13',
    'error.loadFailed': 'Data load failed',
    'error.loadHint': 'Make sure you\'ve run python export_snapshot.py in the liuhe-atlas/ directory.',
    'error.loading': 'Loading snapshot…',
  },
};

// Initial sync of <html lang>
if (typeof document !== 'undefined') {
  document.documentElement.lang = _locale === 'zh-CN' ? 'zh-CN' : 'en';
}

export function useLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
} {
  // Subscribe to module-level state changes
  const [, forceRender] = useState(0);

  useEffect(() => {
    const sub = () => forceRender(x => x + 1);
    _subscribers.add(sub);
    return () => { _subscribers.delete(sub); };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleGlobal(l);
    forceRender(x => x + 1);  // force immediate re-render
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let s = TRANSLATIONS[_locale][key] ?? TRANSLATIONS['zh-CN'][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    },
    // re-create t when locale changes (forceRender trigger)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_locale]
  );

  return { locale: _locale, setLocale, t };
}