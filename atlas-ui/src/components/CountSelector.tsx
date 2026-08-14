import { useEffect, useState } from 'react';

const MIN = 1;
const MAX = 47;
const DEBOUNCE_MS = 300;

interface Props {
  value: number;
  onChange: (count: number) => void;
}

export function CountSelector({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft < MIN || draft > MAX) return;
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, onChange, value]);

  const isInvalid = draft < MIN || draft > MAX;

  return (
    <div className="panel p-4 flex flex-col gap-2">
      <div className="h-row">
        <label htmlFor="count-number" className="label">
          推荐数量 (1-47)
        </label>
        <input
          id="count-number"
          type="number"
          min={MIN}
          max={MAX}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          className="w-16 px-2 py-1 rounded bg-bg-raised border border-line-default text-ink-primary text-sm num text-right"
        />
      </div>
      <input
        type="range"
        aria-label="推荐数量滑块"
        min={MIN}
        max={MAX}
        value={Math.min(Math.max(draft, MIN), MAX)}
        onChange={(e) => setDraft(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
      {isInvalid && (
        <p className="text-[10px] text-warn-text">请输入 1 到 47 之间的整数</p>
      )}
    </div>
  );
}
