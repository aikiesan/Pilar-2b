'use client';

/**
 * Land around: the floating window of the map's click tool.
 *
 * A click on the map (MapComponent, LandAroundLayer) sets a point; this window
 * measures the land within the chosen radius through /proximity/analyze and
 * shows what share of the whole circle is cropland, pasture and planted forest.
 *
 * Landscape (every desktop): a card on the right, under the control row.
 * Portrait (phones): a bottom sheet, like the municipality profile.
 *
 * The window itself is presentational (LandAroundWindow); the default export
 * adds the request, so the states can be tested without a network.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import { Link } from '@/navigation';
import { loginHref } from '@/lib/authRedirect';
import {
  LAND_AROUND_RADII,
  isInLandAroundBounds,
  nearestInfrastructure,
  summarizeLandAround,
  writeLandAroundParams,
  type LandAroundPoint,
  type LandAroundRadius,
  type LandRow,
} from '@/lib/landAround';
import { analyzeProximity, ProximityError, type ProximityAnalysisResult } from '@/services/proximityApi';
import type { Messages } from '@/types/i18n';

type ClassKey = keyof Messages['Map']['mapbiomasLegend']['classes'];

export type LandAroundStatus = 'signed_out' | 'idle' | 'loading' | 'done' | 'error';

export interface LandAroundState {
  status: LandAroundStatus;
  result?: ProximityAnalysisResult | null;
  error?: ProximityError | null;
}

/** Runs the analysis for a point and radius; null point means idle. */
export function useLandAroundAnalysis(
  point: LandAroundPoint | null,
  radius: LandAroundRadius,
  enabled: boolean,
): LandAroundState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // Only a settled request is state; idle, out of bounds and loading follow
  // from the inputs, so the effect never sets state before the answer comes.
  const [settled, setSettled] = useState<(LandAroundState & { key: string }) | null>(null);
  const lat = point?.lat;
  const lng = point?.lng;
  const key = enabled && lat !== undefined && lng !== undefined ? `${lat},${lng},${radius},${attempt}` : null;
  // The backend refuses anything outside its São Paulo box; say so without asking.
  const outOfBounds = lat !== undefined && lng !== undefined && !isInLandAroundBounds(lat, lng);

  useEffect(() => {
    if (key === null || outOfBounds || lat === undefined || lng === undefined) return;
    let live = true;
    analyzeProximity({
      latitude: lat,
      longitude: lng,
      radius_km: radius,
      options: { include_mapbiomas: true, include_biogas_potential: true, include_infrastructure: true },
    })
      .then((result) => { if (live) setSettled({ key, status: 'done', result }); })
      .catch((err: unknown) => {
        if (live) setSettled({ key, status: 'error', error: err instanceof ProximityError ? err : new ProximityError('server') });
      });
    return () => { live = false; };
  }, [key, outOfBounds, lat, lng, radius]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const state = useMemo<LandAroundState>(() => {
    if (key === null) return { status: 'idle' };
    if (outOfBounds) return { status: 'error', error: new ProximityError('invalid_coordinates') };
    if (settled?.key !== key) return { status: 'loading' };
    return { status: settled.status, result: settled.result, error: settled.error };
  }, [key, outOfBounds, settled]);
  return { ...state, retry };
}

export interface LandAroundWindowProps extends LandAroundState {
  point: LandAroundPoint | null;
  radius: LandAroundRadius;
  /** The municipality the visitor clicked on, to name the place before the server does. */
  placeHint?: string | null;
  onRadiusChange: (radius: LandAroundRadius) => void;
  onClose: () => void;
  onRetry?: () => void;
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

export function LandAroundWindow({
  status,
  result,
  error,
  point,
  radius,
  placeHint,
  onRadiusChange,
  onClose,
  onRetry,
}: LandAroundWindowProps) {
  const t = useTranslations('Map.landAround');
  const tClass = useTranslations('Map.mapbiomasLegend.classes');
  const locale = useLocale();

  const summary = useMemo(
    () => (status === 'done' && result ? summarizeLandAround(result, radius) : null),
    [status, result, radius],
  );

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
  // Small shares keep a decimal, so 0.4% does not read as nothing.
  const pct = (share: number) => number(share, share > 0 && share < 10 ? 1 : 0);

  const rowName = (row: LandRow) => {
    if (row.kind === 'other_farming') return t('rows.other_farming');
    if (row.kind === 'unmapped') return t('rows.unmapped');
    const key = String(row.classId) as ClassKey;
    return tClass.has(key) ? tClass(key) : row.servedName || t('class_fallback', { id: key });
  };

  const place = placeHint || summary?.placeName || null;
  const title = !point || status === 'signed_out' || status === 'idle'
    ? t('toggle')
    : place ? t('title', { radius, place }) : t('title_point', { radius });

  const errorText = (e: ProximityError | null | undefined) => {
    if (!e) return t('errors.server');
    return e.code === 'rate_limited'
      ? t('errors.rate_limited', { seconds: e.retryAfter ?? 60 })
      : t(`errors.${e.code}`);
  };

  const loginNext = `/map?${writeLandAroundParams('', { on: true, point, radius }).toString()}`;

  return (
    <aside
      aria-label={t('window_aria')}
      className="surface-light absolute z-[1101] flex flex-col overflow-y-auto border-line bg-paper text-ink shadow-xl
                 inset-x-0 bottom-0 max-h-[55%] rounded-t-2xl border-t
                 landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-16 landscape:z-[999]
                 landscape:max-h-[calc(100%-5rem)] landscape:w-[340px] landscape:rounded-none landscape:border"
    >
      {/* Drag-handle look, bottom sheet only */}
      <div className="flex justify-center pt-2 landscape:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
      </div>

      <header className="flex items-start gap-2 px-4 pb-2 pt-1 landscape:pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-snug text-ink">{title}</h2>
          {summary && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {t('meta', { count: summary.municipalityCount, area: number(summary.circleKm2) })}
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

      {status !== 'signed_out' && (
        <div role="group" aria-label={t('radius_group')} className="mx-4 grid grid-cols-3 border border-line">
          {LAND_AROUND_RADII.map((r) => {
            const on = r === radius;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                disabled={status === 'loading' && on}
                onClick={() => { if (!on) onRadiusChange(r); }}
                className={`min-h-11 border-l border-line text-sm tabular-nums transition-colors first:border-l-0 disabled:cursor-wait ${focusRing} ${
                  on
                    ? 'bg-ink font-semibold text-paper'
                    : 'text-ink hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                {t('radius_option', { radius: r })}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-4 pb-4 pt-3">
        {status === 'signed_out' && (
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

        {status === 'idle' && <p className="text-sm text-ink-muted">{t('idle', { radius })}</p>}

        {status === 'loading' && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {t('loading')}
          </p>
        )}

        {status === 'error' && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-ink">{errorText(error)}</p>
            {error?.code !== 'invalid_coordinates' && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex min-h-11 items-center border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-paper-sunken active:bg-line/60 ${focusRing}`}
              >
                {t('retry')}
              </button>
            )}
          </div>
        )}

        {summary && summary.empty && <p className="text-sm text-ink">{t('empty', { radius })}</p>}

        {summary && !summary.empty && result && (
          <div className="space-y-4">
            <div>
              <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink">
                {t('headline', { share: pct(summary.cropShare) })}
              </p>
              <p className="mt-1.5 text-sm tabular-nums text-ink-muted">
                {t('subline', { pasture: pct(summary.pastureShare), forest: pct(summary.plantedForestShare) })}
              </p>
            </div>

            {/* Stacked bar: each fill's flex-grow is its share; fills fade in, never grow. */}
            <div role="img" aria-label={t('bar_aria')} className="flex h-3 gap-[2px]">
              {summary.rows.filter((row) => row.share >= 0.3).map((row, i) => (
                <span
                  key={`${row.kind}-${row.classId ?? i}`}
                  className="land-around-fade block h-full"
                  style={{ flexGrow: row.share, flexBasis: 0, backgroundColor: row.color, animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {summary.rows.map((row, i) => (
                <li
                  key={`${row.kind}-${row.classId ?? i}`}
                  className={`flex min-w-0 items-start gap-1.5 ${row.kind === 'unmapped' ? 'col-span-2' : ''}`}
                >
                  <span className="mt-[3px] h-2.5 w-2.5 shrink-0" style={{ backgroundColor: row.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-ink">{rowName(row)}</span>
                  <span className="shrink-0 tabular-nums text-ink-muted">{t('row_share', { share: pct(row.share) })}</span>
                </li>
              ))}
            </ul>

            <Extras result={result} biogas={summary.biogasM3Year} number={number} />

            <p className="text-xs text-ink-muted">{t('move_hint')}</p>
          </div>
        )}

        {status !== 'signed_out' && (
          <p className="mt-4 border-t border-line pt-2 text-[11px] leading-snug text-ink-muted">{t('source')}</p>
        )}
      </div>
    </aside>
  );
}

/** Biogas in the circle and the nearest gas pipeline and thermal plant; rows the server cannot answer are left out. */
function Extras({
  result,
  biogas,
  number,
}: {
  result: ProximityAnalysisResult;
  biogas: number | null;
  number: (value: number, digits?: number) => string;
}) {
  const t = useTranslations('Map.landAround.extras');
  const rows: { label: string; value: string }[] = [];
  if (biogas != null) rows.push({ label: t('biogas'), value: t('biogas_value', { value: number(biogas / 1e6, 1) }) });
  for (const type of ['gas_pipeline', 'substation'] as const) {
    const near = nearestInfrastructure(result, type);
    if (!near) continue;
    rows.push({
      label: t(type),
      value: near.distanceKm != null
        ? t('distance', { distance: number(near.distanceKm, near.distanceKm < 10 ? 1 : 0) })
        : t('none_within', { radius: near.maxKm ?? 0 }),
    });
  }
  if (!rows.length) return null;
  return (
    <dl className="space-y-1 border-t border-line pt-3 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">{row.label}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface LandAroundProps {
  point: LandAroundPoint | null;
  radius: LandAroundRadius;
  placeHint?: string | null;
  signedIn: boolean;
  onRadiusChange: (radius: LandAroundRadius) => void;
  onClose: () => void;
}

/** The window with its request. */
export default function LandAround({ point, radius, placeHint, signedIn, onRadiusChange, onClose }: LandAroundProps) {
  const analysis = useLandAroundAnalysis(point, radius, signedIn);
  const status: LandAroundStatus = signedIn ? analysis.status : 'signed_out';
  return (
    <LandAroundWindow
      status={status}
      result={analysis.result}
      error={analysis.error}
      point={point}
      radius={radius}
      placeHint={placeHint}
      onRadiusChange={onRadiusChange}
      onClose={onClose}
      onRetry={analysis.retry}
    />
  );
}
