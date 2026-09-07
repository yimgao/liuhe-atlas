import { useState } from 'react';
import { useLocale } from '../lib/i18n';

export function DisclaimerBanner() {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      role="alert"
      className="
        sticky top-0 z-50
        bg-warn-bg border-b border-warn-border
        text-warn-text
        font-sans
      "
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-lg leading-none select-none">
          {t('disclaimer.title')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-wide uppercase opacity-80 mb-0.5">
            {t('disclaimer.tag')}
          </div>
          <div className={`text-sm leading-relaxed ${expanded ? '' : 'line-clamp-1'}`}>
            {t('disclaimer.body')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-label={expanded ? 'collapse' : 'expand'}
          className="
            shrink-0 mt-0.5 px-2 py-1 text-xs font-medium uppercase tracking-wide
            opacity-70 hover:opacity-100 transition
            border border-warn-border/50 rounded
          "
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
    </div>
  );
}