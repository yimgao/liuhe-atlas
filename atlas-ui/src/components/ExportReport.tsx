import type { Snapshot, SelectionMode } from '../types';
import { predict, selectBalls } from '../lib/predictor';
import { useLocale } from '../lib/i18n';

interface Props {
  snapshot: Snapshot;
  selected: number[];
  mode: SelectionMode;
  n: number;
}

/**
 * Opens a printable HTML report window. User uses Ctrl+P → "Save as PDF".
 * Avoids heavy PDF library dependencies (jsPDF + html2canvas).
 */
export function ExportReport({ snapshot, selected, mode, n }: Props) {
  const { t, locale } = useLocale();
  const generateReport = () => {
    const prediction = predict(snapshot, 2026);
    const recommended = selectBalls(prediction.ranked, mode, n);
    const exported = new Date(snapshot.meta.exported_at).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');
    const realCount = snapshot.meta.real_period_count ?? snapshot.periods.length;

    const sel = [...selected].sort((a, b) => a - b);
    const selStr = sel.length > 0 ? sel.map(b => String(b).padStart(2, '0')).join(', ') : '—';

    // Build a self-contained HTML document
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<title>${t('export.report')}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a202c; line-height: 1.55; }
  h1 { font-size: 24px; border-bottom: 2px solid #1a202c; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 16px; color: #4a5568; margin-top: 28px; border-left: 3px solid #cbd5e0; padding-left: 10px; }
  .meta { display: flex; gap: 24px; color: #4a5568; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f7fafc; font-weight: 600; color: #2d3748; }
  .num { font-family: 'SF Mono', Monaco, monospace; text-align: right; }
  .disclaimer { background: #fef5e7; border: 1px solid #f6ad55; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #7c2d12; margin-top: 32px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e0; color: #718096; font-size: 11px; }
  @media print { .no-print { display: none; } body { margin: 0; } }
</style>
</head>
<body>
  <h1>${t('export.report')}</h1>
  <div class="meta">
    <span>${t('export.generated')}: ${exported}</span>
    <span>${snapshot.meta.lottery_name}</span>
    <span>${realCount} periods</span>
  </div>

  <h2>${t('app.title')}</h2>
  <p>${t('app.subtitle')}</p>

  <h2>${t('ranked.title')} (Top 10)</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('ranked.column.ball')}</th>
        <th>${t('ranked.column.symbol')}</th>
        <th class="num">${t('ranked.column.prob')}</th>
      </tr>
    </thead>
    <tbody>
      ${prediction.ranked.slice(0, 10).map(b => `
        <tr>
          <td>${b.rank}</td>
          <td class="num"><strong>${String(b.ball).padStart(2, '0')}</strong></td>
          <td>${b.symbol.zodiac} / ${b.symbol.wuxing} / ${b.symbol.wave}</td>
          <td class="num">${(b.probability * 100).toFixed(3)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>${t('controls.apply')} (${mode === 'top-n' ? t('controls.modeTopN') : t('controls.modeCoverN')}, N=${n})</h2>
  <p class="num">${recommended.map(b => String(b).padStart(2, '0')).join(', ') || '—'}</p>

  <h2>${t('controls.selectedCount')} (${sel.length} ${t('controls.ballsUnit')})</h2>
  <p class="num">${selStr}</p>

  <div class="disclaimer">
    ⚠ ${t('export.disclaimer')}<br>
    ${t('disclaimer.body')}
  </div>

  <div class="footer">
    ${t('footer.disclaimer')}<br>
    ${t('footer.lastBuild')}
  </div>

  <div class="no-print" style="text-align:center; margin-top: 24px;">
    <button onclick="window.print()" style="background:#10b981;color:#fff;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
      Print / Save as PDF
    </button>
    <p style="color:#718096;font-size:12px;margin-top:8px;">Use Ctrl+P (Cmd+P on Mac) → choose "Save as PDF" as destination</p>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=1100');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <button
      type="button"
      onClick={generateReport}
      className="
        px-3 py-1.5 rounded text-xs font-medium
        bg-bg-raised border border-line-default text-ink-secondary
        hover:border-line-strong transition
      "
    >
      📄 {t('export.pdf')}
    </button>
  );
}