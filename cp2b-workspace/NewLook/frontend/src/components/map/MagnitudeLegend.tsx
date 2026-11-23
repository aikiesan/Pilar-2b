'use client';

/**
 * The key for Pontos and Símbolos: what a dot is worth, or which amount a
 * circle's area stands for (nested reference circles, as cartographers draw
 * them), and the colours of the origins on the map. Origins the map does not
 * show are left out; municipalities whose data has no split say so.
 */
import { useTranslations } from 'next-intl';
import { SECTOR_COLORS } from '@/data/sectorColors';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import { useSelectionLabel } from '@/hooks/useSelectionLabel';
import type { MagnitudeLegendFacts } from '@/lib/magnitudeViews';
import { legendAmounts, symbolRadius } from '@/lib/sectorSymbols';
import type { DisplayMetric } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/types/map';
import { NO_SPLIT_COLOR } from './magnitudeMarks';
import { dotRadius } from './DotDensityLayer';

interface MagnitudeLegendProps {
  view: 'dots' | 'symbols';
  metric: DisplayMetric;
  biomassType: BiomassType;
  selectedResidues: readonly ResidueType[];
  /** False for a rate (per inhabitant): nothing is drawn, the legend says why. */
  amount: boolean;
  facts: MagnitudeLegendFacts;
  /** Pontos: what one dot is worth, in the metric's display unit. */
  dotValue?: number;
  /** Símbolos: the amount of the largest circle. */
  maxValue?: number;
}

export default function MagnitudeLegend({
  view, metric, biomassType, selectedResidues, amount, facts, dotValue = 0, maxValue = 0,
}: MagnitudeLegendProps) {
  const t = useTranslations('Map.magnitude');
  const tMap = useTranslations('Map');
  const format = useFormat();
  const { legend, unit } = useMetricText()(metric);
  const selection = useSelectionLabel()(biomassType, selectedResidues);
  const value = (v: number) => format.compact(v, { decimals: v >= 1000 ? 1 : 0 });

  return (
    <section
      aria-label={t(view === 'dots' ? 'aria_dots' : 'aria_symbols')}
      className="surface-light w-60 border border-line bg-paper-raised/95 p-3 text-ink shadow-md backdrop-blur-sm"
    >
      <h3 className="font-display text-sm font-bold leading-snug">{legend}</h3>
      <p className="text-xs text-ink-muted">{selection}</p>

      {!amount ? (
        <p className="mt-2 text-xs leading-snug text-ink-muted">{t('rate_note')}</p>
      ) : facts.count === 0 ? (
        <p className="mt-2 text-xs leading-snug text-ink-muted">{t('empty')}</p>
      ) : (
        <>
          {view === 'dots' ? (
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                <svg width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true">
                  <circle r={dotRadius(9)} fill={NO_SPLIT_COLOR} />
                </svg>
                {t('dots_value', { value: value(dotValue), unit })}
              </p>
              <p className="text-[11px] leading-snug text-ink-muted">{t('dots_note')}</p>
            </div>
          ) : (
            <NestedCircles maxValue={maxValue} label={(v) => value(v)} unit={unit} />
          )}

          <div className="mt-2 border-t border-line pt-2">
            <p className="mb-1 text-[11px] text-ink-muted">{t(view === 'dots' ? 'origin_dots' : 'origin_ring')}</p>
            <ul className="space-y-0.5 text-xs">
              {facts.sectors.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s] }} aria-hidden="true" />
                  {tMap(`categories.${s}`)}
                </li>
              ))}
              {facts.unsplit > 0 && (
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NO_SPLIT_COLOR }} aria-hidden="true" />
                  {t('unsplit', { count: facts.unsplit })}
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

/** Reference circles nested at the bottom, each labelled at its top. */
function NestedCircles({ maxValue, label, unit }: { maxValue: number; label: (v: number) => string; unit: string }) {
  const t = useTranslations('Map.magnitude');
  const amounts = legendAmounts(maxValue);
  const radii = amounts.map((v) => symbolRadius(v, maxValue));
  const R = radii[0] ?? 0;
  if (!R) return null;
  const width = R * 2 + 96;
  const height = R * 2 + 4;
  const cx = R + 2;
  const base = height - 2;
  return (
    <div className="mt-2 space-y-1">
      <svg width={width} height={height} role="img" aria-label={t('circles_aria', { values: amounts.map(label).join(', '), unit })}>
        {amounts.map((v, i) => {
          const r = radii[i];
          const top = base - 2 * r;
          return (
            <g key={v}>
              <circle cx={cx} cy={base - r} r={r} fill="none" stroke="#1E3E4C" strokeOpacity={0.6} strokeWidth={0.75} />
              <line x1={cx} y1={top} x2={R * 2 + 10} y2={top} stroke="#1E3E4C" strokeOpacity={0.35} strokeWidth={0.75} strokeDasharray="2 2" />
              <text x={R * 2 + 14} y={top + 3.5} fontSize={10} fill="currentColor" className="tabular-nums">{label(v)}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] leading-snug text-ink-muted">{t('symbols_area', { unit })}</p>
    </div>
  );
}
