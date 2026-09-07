import { useTheme } from '../lib/theme';
import { useLocale } from '../lib/i18n';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={t('theme.toggle')}
      className="
        flex items-center gap-1.5 panel-raised p-1 rounded
        hover:border-line-strong transition
      "
    >
      {isDark ? (
        <span className="text-[11px] font-medium px-2 py-0.5">
          🌙 <span className="text-ink-secondary">{t('theme.dark')}</span>
        </span>
      ) : (
        <span className="text-[11px] font-medium px-2 py-0.5">
          ☀️ <span className="text-ink-secondary">{t('theme.light')}</span>
        </span>
      )}
    </button>
  );
}