import type { CoverageReport } from '../types';
import { useLocale } from '../lib/i18n';

interface Props {
  coverage: CoverageReport;
  selectedCount: number;
  totalCount: number;
}

const zodiacOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const;
const wuxingOrder = ['金', '木', '水', '火', '土'] as const;
const waveOrder = ['红', '蓝', '绿'] as const;

const wuxingBg: Record<string, string> = {
  金: 'bg-yellow-400',
  木: 'bg-emerald-400',
  水: 'bg-blue-400',
  火: 'bg-red-400',
  土: 'bg-stone-400',
};

const waveBg: Record<string, string> = {
  红: 'bg-red-400',
  蓝: 'bg-blue-400',
  绿: 'bg-emerald-400',
};

function DimensionRow<K extends string>({
  label, order, data, colorFn,
}: {
  label: string;
  order: readonly K[];
  data: Record<K, { selected: number; available: number }>;
  colorFn: (k: K) => string;
}) {
  const totalSelected = Object.values(data).reduce(
  (s: number, v) => s + (v as { selected: number; available: number }).selected,
  0,
);
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-12 label">{label}</div>
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {order.map(k => {
          const { selected, available } = data[k];
          const coverage = available > 0 ? selected / available : 0;
          return (
            <div
              key={k}
              className={`
                relative px-2 py-1 rounded
                ${colorFn(k)}
                ${selected > 0 ? 'opacity-100' : 'opacity-25'}
                transition
              `}
              title={`${k}: ${selected}/${available} (${(coverage * 100).toFixed(0)}%)`}
            >
              <span className="num font-medium">{k}</span>
              <span className="text-[10px] ml-1.5 num opacity-80">{selected}</span>
            </div>
          );
        })}
      </div>
      <div className="w-16 text-right text-[10px] text-ink-muted num">
        {totalSelected}/49
      </div>
    </div>
  );
}

export function CoverageAnalyzer({ coverage, selectedCount, totalCount }: Props) {
  const { t } = useLocale();

  return (
    <div className="panel p-4 space-y-3">
      <div className="h-row">
        <h3 className="label">{t('coverage.title')}</h3>
        <span className="text-[10px] text-ink-muted num">
          {selectedCount} {t('coverage.ofTotal')} {totalCount} {t('controls.ballsUnit')}
        </span>
      </div>

      <DimensionRow
        label={t('coverage.zodiac')}
        order={zodiacOrder}
        data={coverage.zodiac}
        colorFn={_k => 'bg-bg-raised border border-line-default text-ink-secondary'}
      />
      <DimensionRow
        label={t('coverage.wuxing')}
        order={wuxingOrder}
        data={coverage.wuxing}
        colorFn={k => `${wuxingBg[k]} text-bg-base`}
      />
      <DimensionRow
        label={t('coverage.wave')}
        order={waveOrder}
        data={coverage.wave}
        colorFn={k => `${waveBg[k]} text-bg-base`}
      />

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-subtle">
        <div className="text-xs">
          <span className="label mr-2">{t('coverage.odd')}</span>
          <span className="num text-ink-secondary">
            {coverage.odd_even.单.selected}/{coverage.odd_even.单.available}
          </span>
        </div>
        <div className="text-xs text-right">
          <span className="label mr-2">{t('coverage.even')}</span>
          <span className="num text-ink-secondary">
            {coverage.odd_even.双.selected}/{coverage.odd_even.双.available}
          </span>
        </div>
      </div>
    </div>
  );
}