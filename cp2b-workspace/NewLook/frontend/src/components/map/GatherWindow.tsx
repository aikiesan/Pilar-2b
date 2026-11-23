'use client';

/**
 * Gather: the floating window of the map's catchment tool. How much
 * biomethane one plant at the clicked point could collect from the
 * municipalities whose centre is within the radius (lib/gather.ts).
 *
 * The counter adds up on the same clock as the particles on the map, so the
 * number grows as the flow arrives; with reduced motion it is there at once.
 *
 * Landscape (every desktop): a card on the right, under the control row.
 * Portrait (phones): a bottom sheet, like the other tools.
 */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Link } from '@/navigation';
import { useFormat } from '@/hooks/useFormat';
import { loginHref } from '@/lib/authRedirect';
import {
  arrivedShare,
  averageMw,
  GATHER_RADII,
  GATHER_SOURCES,
  GATHER_TOTAL_MS,
  type GatherRadius,
  type GatherResult,
} from '@/lib/gather';
import type { LatLng } from '@/lib/mapGeometry';
import { prefersReducedMotion } from '@/lib/mapMotion';
import type { MapToolAccess } from '@/lib/mapToolAccess';
import { currentMapSearch, writeMapToolParams } from '@/lib/mapTools';
import { ufAbbreviation } from '@/lib/municipalitySearch';
import { SOURCE_COLORS } from './magnitudeMarks';
import { MAP_WINDOW_CLASS } from './mapWindowShell';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

export interface GatherWindowProps {
  access: MapToolAccess;
  point: LatLng | null;
  /** The municipality the point lies in, by name. */
  place: string | null;
  radius: GatherRadius;
  onRadiusChange: (radius: GatherRadius) => void;
  result: GatherResult | null;
  /** The scenario's name, as the map shows it. */
  scenarioLabel: string;
  onClose: () => void;
}

/** The counter's share of the total, on the flow's clock. */
function useArrived(key: string | null): number {
  const [progress, setProgress] = useState<{ key: string | null; share: number }>({ key: null, share: 1 });
  const animate = key !== null && !prefersReducedMotion();
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = now - t0;
      setProgress({ key, share: arrivedShare(t) });
      if (t < GATHER_TOTAL_MS) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, animate]);
  if (!animate) return 1;
  // A new flow starts from nothing, before its first frame.
  return progress.key === key ? progress.share : 0;
}

export default function GatherWindow({
  access, point, place, radius, onRadiusChange, result, scenarioLabel, onClose,
}: GatherWindowProps) {
  const t = useTranslations('Map.gather');
  const tTools = useTranslations('Map.mapTools');
  const tMap = useTranslations('Map');
  const format = useFormat();
  const gated = access === 'sign_in' || access === 'pending';
  const flowKey = point && result ? `${point.lat},${point.lng},${radius},${result.total}` : null;
  const arrived = useArrived(flowKey);

  const millions = (m3: number, decimals = 1) => format.number(m3 / 1e6, { decimals });
  const pct = (share: number) => format.number(share * 100, { decimals: 0 });
  const loginNext = `/map?${writeMapToolParams(currentMapSearch(), { tool: 'gather', gather: { point, radius, hub: null } }).toString()}`;
  const sourceName = (s: (typeof GATHER_SOURCES)[number]) =>
    s === 'unsplit' ? t('unsplit') : tMap(`categories.${s}`);

  return (
    <aside
      aria-label={t('window_aria')}
      className={MAP_WINDOW_CLASS}
    >
      <div className="flex justify-center pt-2 landscape:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
      </div>

      <header className="flex items-start gap-2 px-4 pb-2 pt-1 landscape:pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-snug text-ink">
            {point && result ? (place ? t('title', { place }) : t('title_point')) : t('name')}
          </h2>
          {point && result && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {t('meta', { count: result.members.length, radius })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          title={t('close')}
          className={`-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink active:bg-line/60 ${focusRing}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {!gated && (
        <div role="group" aria-label={t('radius_group')} className="mx-4 grid grid-cols-3 border border-line">
          {GATHER_RADII.map((r) => {
            const on = r === radius;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                disabled={access === 'loading'}
                onClick={() => { if (!on) onRadiusChange(r); }}
                className={`min-h-11 border-l border-line text-sm tabular-nums transition-colors first:border-l-0 disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
                  on ? 'bg-ink font-semibold text-paper' : 'text-ink hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                {t('radius_option', { radius: r })}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 pb-4 pt-3">
        {access === 'sign_in' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink">{t('signed_out_title')}</p>
            <p className="text-sm text-ink-muted">{t('signed_out_body')}</p>
            <Link
              href={loginHref(loginNext)}
              className={`inline-flex min-h-11 items-center bg-terra-800 px-4 text-sm font-medium text-white transition-colors hover:bg-terra-900 active:bg-terra-950 ${focusRing}`}
            >
              {t('sign_in')}
            </Link>
          </div>
        )}

        {access === 'pending' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">{tTools('pending_title')}</p>
            <p className="text-sm text-ink-muted">{tTools('pending_body')}</p>
          </div>
        )}

        {!gated && (!point || !result) && <p className="text-sm text-ink-muted">{t('idle', { radius })}</p>}

        {!gated && point && result && result.total === 0 && (
          <p className="text-sm text-ink">{t('empty', { radius })}</p>
        )}

        {!gated && point && result && result.total > 0 && (
          <div className="space-y-4">
            <div>
              <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink" aria-hidden="true">
                {t('total_value', { value: millions(result.total * arrived) })}
              </p>
              {/* The number read out once, whole, not on every frame. */}
              <p className="sr-only">{t('total_value', { value: millions(result.total) })}</p>
              <p className="mt-1.5 text-sm text-ink-muted">{t('total_label', { scenario: scenarioLabel })}</p>
              <p className="mt-1 text-sm tabular-nums text-ink">
                {t('power', { mw: format.number(averageMw(result.total), { decimals: averageMw(result.total) < 10 ? 1 : 0 }) })}
              </p>
            </div>

            {/* By source: fills sized by flex-grow, fading in, never growing. */}
            <div>
              <div
                role="img"
                aria-label={t('sources_aria', {
                  list: GATHER_SOURCES.filter((s) => result.bySource[s] > 0)
                    .map((s) => `${sourceName(s)} ${pct(result.bySource[s] / result.total)}%`)
                    .join(', '),
                })}
                className="flex h-2.5 gap-[2px]"
              >
                {GATHER_SOURCES.map((s) => result.bySource[s] > 0 && (
                  <span
                    key={s}
                    className="land-around-fade block h-full"
                    style={{ flexGrow: result.bySource[s], flexBasis: 0, backgroundColor: SOURCE_COLORS[s] }}
                  />
                ))}
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {GATHER_SOURCES.filter((s) => result.bySource[s] > 0).map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: SOURCE_COLORS[s] }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-ink">{sourceName(s)}</span>
                    <span className="tabular-nums text-ink-muted">
                      {t('source_value', { value: millions(result.bySource[s]), share: pct(result.bySource[s] / result.total) })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-1.5 text-xs text-ink-muted">{t('top_title')}</p>
              <ol className="space-y-1 text-sm">
                {result.top.map((m) => (
                  <li key={m.code} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-ink">
                      {m.name}
                      <span className="text-xs text-ink-muted"> {ufAbbreviation(m.code) ?? ''}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-muted">{t('top_share', { share: pct(m.share) })}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-1.5 border-t border-line pt-3 text-[11px] leading-snug text-ink-muted">
              {result.crossesBorder && <p>{t('border')}</p>}
              {result.withoutData > 0 && <p>{t('without_data', { count: result.withoutData })}</p>}
              <p>{t('straight_line')}</p>
              <p>{t('move_hint')}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
