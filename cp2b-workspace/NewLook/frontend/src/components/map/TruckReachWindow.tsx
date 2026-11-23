'use client';

/**
 * Truck reach: the floating window of the map's road tool. Where a truck gets
 * from the picked site within 30, 60 or 90 minutes, what lies there, and how
 * that compares with a 50 km circle (lib/truckReach.ts).
 *
 * No per-site methane: the mills' and landfills' own figures are unpublished
 * model results and stay off the site.
 *
 * Landscape (every desktop): a card on the right, under the control row.
 * Portrait (phones): a bottom sheet, like the other tools.
 */
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Link } from '@/navigation';
import { useFormat } from '@/hooks/useFormat';
import { loginHref } from '@/lib/authRedirect';
import type { MapToolAccess } from '@/lib/mapToolAccess';
import { currentMapSearch, writeMapToolParams } from '@/lib/mapTools';
import {
  isInSaoPaulo,
  TRUCK_CIRCLE_KM,
  TRUCK_LIMITS,
  type TruckLimit,
  type TruckSite,
  type TruckSiteArrival,
  type TruckSummary,
} from '@/lib/truckReach';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

/** Where the picked site's routes stand. */
export type TruckReachState = 'ready' | 'loading' | 'failed' | 'unavailable' | 'not_found';

export interface TruckReachWindowProps {
  access: MapToolAccess;
  /** The picked site's id, from a click or a link. */
  siteId: string | null;
  /** The picked site, once the sites list or its routes are in. */
  site: TruckSite | null;
  state: TruckReachState;
  summary: TruckSummary | null;
  limit: TruckLimit;
  onLimitChange: (limit: TruckLimit) => void;
  showCircle: boolean;
  onCircleChange: (show: boolean) => void;
  /** A row of the nearest list picks that site instead. */
  onPickSite: (siteId: string) => void;
  /** A row pointed at (hover or focus) rings its site on the map. */
  onHoverSite: (siteId: string | null) => void;
  onClose: () => void;
}

export default function TruckReachWindow({
  access, siteId, site, state, summary, limit, onLimitChange, showCircle, onCircleChange, onPickSite, onHoverSite, onClose,
}: TruckReachWindowProps) {
  const t = useTranslations('Map.truck');
  const tTools = useTranslations('Map.mapTools');
  const format = useFormat();
  const gated = access === 'sign_in' || access === 'pending';
  const outside = site !== null && !isInSaoPaulo(site.ibge_code);
  const ready = !gated && siteId && site && !outside && state === 'ready' && summary ? summary : null;
  const nearestList = (label: string, rows: TruckSiteArrival[]) => (
    <div>
      <p className="mb-1 text-xs text-ink-muted">{label}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('nearest_none', { minutes: limit })}</p>
      ) : (
        <ol className="-mx-2">
          {rows.map((row) => {
            const minutes = format.number(row.minutes, { decimals: 0 });
            return (
              <li key={row.site.site_id}>
                <button
                  type="button"
                  aria-label={t('nearest_row_aria', { name: row.site.name, town: row.site.municipality, minutes })}
                  onClick={() => { onHoverSite(null); onPickSite(row.site.site_id); }}
                  onMouseEnter={() => onHoverSite(row.site.site_id)}
                  onMouseLeave={() => onHoverSite(null)}
                  onFocus={() => onHoverSite(row.site.site_id)}
                  onBlur={() => onHoverSite(null)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-2 text-left text-sm transition-colors hover:bg-paper-sunken active:bg-line/60 ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{row.site.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{row.site.municipality}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-muted">{t('nearest_minutes', { minutes })}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
  const loginNext = `/map?${writeMapToolParams(currentMapSearch(), { tool: 'truck', truck: { site: siteId, limit } }).toString()}`;

  return (
    <aside
      aria-label={t('window_aria')}
      className="surface-light absolute z-[1101] map-window flex flex-col overflow-y-auto border-line bg-paper text-ink shadow-xl
                 inset-x-0 bottom-0 max-h-[55%] rounded-t-2xl border-t
                 landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-16 landscape:z-[999]
                 landscape:max-h-[calc(100%-5rem)] landscape:w-[340px] landscape:rounded-none landscape:border"
    >
      <div className="flex justify-center pt-2 landscape:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
      </div>

      <header className="flex items-start gap-2 px-4 pb-2 pt-1 landscape:pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-snug text-ink">
            {!gated && site ? site.name : t('name')}
          </h2>
          {!gated && site && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {t('site_meta', { kind: t(`kinds.${site.kind}`), town: site.municipality })}
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
        <div role="group" aria-label={t('limit_group')} className="mx-4 grid grid-cols-3 border border-line">
          {TRUCK_LIMITS.map((l) => {
            const on = l === limit;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                disabled={access === 'loading'}
                onClick={() => { if (!on) onLimitChange(l); }}
                className={`min-h-11 border-l border-line text-sm tabular-nums transition-colors first:border-l-0 disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
                  on ? 'bg-ink font-semibold text-paper' : 'text-ink hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                {t('limit_option', { minutes: l })}
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

        {!gated && !siteId && state !== 'unavailable' && <p className="text-sm text-ink-muted">{t('idle')}</p>}
        {!gated && !siteId && state === 'unavailable' && <p className="text-sm text-ink">{t('unavailable')}</p>}
        {!gated && siteId && outside && <p className="text-sm text-ink">{t('outside')}</p>}
        {!gated && siteId && !outside && state === 'loading' && (
          <p className="text-sm text-ink-muted" role="status">{t('loading')}</p>
        )}
        {!gated && siteId && !outside && state === 'failed' && <p className="text-sm text-ink">{t('failed')}</p>}
        {!gated && siteId && !outside && state === 'unavailable' && <p className="text-sm text-ink">{t('unavailable')}</p>}
        {!gated && siteId && state === 'not_found' && <p className="text-sm text-ink">{t('not_found')}</p>}

        {ready && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">
              {t('headline', { count: ready.byLimit[limit], minutes: limit })}
            </p>

            <table className="w-full text-sm">
              <caption className="sr-only">{t('table_caption')}</caption>
              <tbody>
                {TRUCK_LIMITS.map((l) => (
                  <tr key={l} className={`border-b border-line last:border-b-0 ${l === limit ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                    <th scope="row" className="py-1.5 text-left font-[inherit]">{t('table_row', { minutes: l })}</th>
                    <td className="py-1.5 text-right tabular-nums">{format.number(ready.byLimit[l], { decimals: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('cane_label')}</dt>
                <dd className="tabular-nums text-ink">{t('cane_value', { value: format.number(ready.caneTons / 1e3, { decimals: 0 }) })}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('biomethane_label')}</dt>
                <dd className="tabular-nums text-ink">{t('biomethane_value', { value: format.number(ready.biomethane / 1e6, { decimals: 1 }) })}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{t('sites_label')}</dt>
                <dd className="text-right text-ink">
                  {t('sites_value', { mills: ready.otherSites.mills, landfills: ready.otherSites.landfills })}
                  {ready.otherSites.plants > 0 && <> {t('sites_plants', { count: ready.otherSites.plants })}</>}
                </dd>
              </div>
            </dl>

            <div className="space-y-3 border-t border-line pt-3">
              <p className="text-sm font-semibold text-ink">{t('nearest_title')}</p>
              {nearestList(t('nearest_mills'), ready.nearest.mills)}
              {nearestList(t('nearest_landfills'), ready.nearest.landfills)}
            </div>

            <p className="border-t border-line pt-3 text-sm text-ink">
              {ready.pipeline
                ? (ready.pipeline.beyond
                  ? t('pipeline_beyond', { minutes: format.number(ready.pipeline.minutes, { decimals: 0 }), limit })
                  : t('pipeline', { minutes: format.number(ready.pipeline.minutes, { decimals: 0 }) }))
                : t('pipeline_none')}
            </p>

            <div className="space-y-2 border-t border-line pt-3">
              <button
                type="button"
                aria-pressed={showCircle}
                onClick={() => onCircleChange(!showCircle)}
                className={`inline-flex min-h-11 items-center gap-2 border border-line px-3 text-sm transition-colors ${focusRing} ${
                  showCircle ? 'bg-ink font-semibold text-paper' : 'text-ink hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                {t('circle_toggle', { km: TRUCK_CIRCLE_KM })}
              </button>
              <p className="text-sm text-ink">
                {t('circle_compare', {
                  km: TRUCK_CIRCLE_KM,
                  inCircle: ready.circle.inCircle,
                  slower: ready.circle.slowerByRoad,
                  minutes: limit,
                  beyond: ready.circle.roadBeyondCircle,
                })}
              </p>
            </div>

            <div className="space-y-1.5 border-t border-line pt-3 text-[11px] leading-snug text-ink-muted">
              {ready.withoutData > 0 && <p>{t('without_data', { count: ready.withoutData })}</p>}
              <p>{t('nearest_note')}</p>
              <p>{t('source')}</p>
              <p>{t('sp_only')}</p>
              <p>{t('straight_line')}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
