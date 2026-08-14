export type Mode = 'model' | 'random';

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const TABS: { key: Mode; label: string }[] = [
  { key: 'model', label: '模型推荐' },
  { key: 'random', label: '今日幸运号' },
];

export function StrategyTabs({ mode, onChange }: Props) {
  return (
    <div className="panel p-1 flex gap-1" role="tablist" aria-label="选号方式">
      {TABS.map((tab) => {
        const active = tab.key === mode;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
              active
                ? 'bg-gradient-to-b from-emerald-500/90 to-emerald-600/90 text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-raised'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
