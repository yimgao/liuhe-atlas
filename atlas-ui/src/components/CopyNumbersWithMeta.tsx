import { useState } from 'react';
import type { Snapshot } from '../types';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  selected: number[];
}

/**
 * Copy numbers to clipboard with rich metadata header.
 */
export function CopyNumbersWithMeta({ snapshot, selected }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const sorted = [...selected].sort((a, b) => a - b);
    const ballStr = sorted.map(b => String(b).padStart(2, '0')).join(' ');
    const realCount = snapshot.meta.real_period_count ?? snapshot.periods.length;
    const exported = new Date(snapshot.meta.exported_at).toISOString();

    const text = `# liuhe-atlas · ${snapshot.meta.lottery_name}
# Generated: ${exported}
# Data: ${realCount} real periods
# Model: Bayesian L2 (symbol-aggregated)
# Source: ${snapshot.periods[0]?.source_domain ?? 'unknown'}
# Balls selected: ${sorted.length}
${ballStr}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={selected.length === 0}
      className={`
        px-3 py-1.5 rounded text-xs font-medium transition
        border
        ${copied
          ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-200'
          : 'bg-bg-raised border-line-default text-ink-secondary hover:border-line-strong'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {copied ? '✓ copied!' : `📋 ${t('app.copyNumbers')}`}
    </button>
  );
}