import { useLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from '../lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 panel-raised p-1 rounded">
      {SUPPORTED_LOCALES.map(loc => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`
              px-2.5 py-1 text-[11px] font-medium tracking-wide rounded transition
              ${isActive
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-raised border border-transparent'
              }
            `}
            title={LOCALE_LABELS[loc].english}
          >
            {LOCALE_LABELS[loc].native}
          </button>
        );
      })}
    </div>
  );
}