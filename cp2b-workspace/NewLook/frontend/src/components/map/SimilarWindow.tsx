'use client';

/**
 * Find similar: the floating window of the map's likeness tool. The twelve
 * municipalities whose residue mix, land cover and size come closest to the
 * picked one (lib/similarity.ts).
 *
 * Each row is a button: pointing at it outlines that municipality on the map,
 * clicking it opens its profile (which closes the tool).
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
import { currentMapSearch, writeMapToolParams, type SimilarWithin } from '@/lib/mapTools';
import { ufAbbreviation } from '@/lib/municipalitySearch';
import type { SimilarResult } from '@/lib/similarity';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

/** Where the land cover the profiles need stands. */
export type SimilarDataState = 'ready' | 'loading' | 'failed' | 'unavailable';

const WITHIN: readonly SimilarWithin[] = ['state', 'both'];

export interface SimilarWindowProps {
  access: MapToolAccess;
  /** The picked municipality's code, from a click, the search or a link. */
  of: string | null;
  /** Its name, for the titles. */
  ofName: string | null;
  within: SimilarWithin;
  onWithinChange: (within: SimilarWithin) => void;
  dataState: SimilarDataState;
  result: SimilarResult | null;
  /** A match's biomethane in the map's scenario, m³/yr; null without data. */
  biomethaneOf: (code: string) => number | null;
  /** The scenario's name, as the map shows it. */
  scenarioLabel: string;
  onHover: (code: string | null) => void;
  onOpen: (code: string) => void;
  onClose: () => void;
}

export default function SimilarWindow({
  access, of, ofName, within, onWithinChange, dataState, result, biomethaneOf, scenarioLabel, onHover, onOpen, onClose,
}: SimilarWindowProps) {
  const t = useTranslations('Map.similar');
  const tTools = useTranslations('Map.mapTools');
  const format = useFormat();
  const gated = access === 'sign_in' || access === 'pending';
  const ready = result?.status === 'ready' ? result : null;
  const name = ofName ?? of ?? '';
  const loginNext = `/map?${writeMapToolParams(currentMapSearch(), { tool: 'similar', similar: { of, within } }).toString()}`;

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
            {ready ? t('title', { name: ready.origin.name }) : t('name')}
          </h2>
          {ready && <p className="mt-0.5 text-xs text-ink-muted">{t('subtitle')}</p>}
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
        <div role="group" aria-label={t('within_group')} className="mx-4 grid grid-cols-2 border border-line">
          {WITHIN.map((w) => {
            const on = w === within;
            return (
              <button
                key={w}
                type="button"
                aria-pressed={on}
                disabled={access === 'loading'}
                onClick={() => { if (!on) onWithinChange(w); }}
                className={`min-h-11 border-l border-line text-sm transition-colors first:border-l-0 disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
                  on ? 'bg-ink font-semibold text-paper' : 'text-ink hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                {t(`within_${w}`)}
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

        {!gated && !of && <p className="text-sm text-ink-muted">{t('idle')}</p>}

        {!gated && of && dataState === 'loading' && <p className="text-sm text-ink-muted" role="status">{t('loading')}</p>}
        {!gated && of && dataState === 'failed' && <p className="text-sm text-ink">{t('failed')}</p>}
        {!gated && of && dataState === 'unavailable' && <p className="text-sm text-ink">{t('unavailable')}</p>}

        {!gated && of && dataState === 'ready' && result?.status === 'no_profile' && (
          <p className="text-sm text-ink">{t('no_profile', { name })}</p>
        )}

        {!gated && of && dataState === 'ready' && ready && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">{t('value_caption', { scenario: scenarioLabel })}</p>
            <ol className="-mx-2">
              {ready.matches.map((m) => {
                const value = biomethaneOf(m.code);
                const pct = format.number(m.similarity * 100, { decimals: 0 });
                return (
                  <li key={m.code}>
                    <button
                      type="button"
                      onClick={() => onOpen(m.code)}
                      onMouseEnter={() => onHover(m.code)}
                      onMouseLeave={() => onHover(null)}
                      onFocus={() => onHover(m.code)}
                      onBlur={() => onHover(null)}
                      className={`grid min-h-11 w-full grid-cols-[minmax(0,1fr)_4rem_4.5rem] items-center gap-3 px-2 text-left text-sm transition-colors hover:bg-paper-sunken active:bg-line/60 ${focusRing}`}
                    >
                      <span className="min-w-0 truncate text-ink">
                        {m.name}
                        <span className="text-xs text-ink-muted"> {ufAbbreviation(m.code) ?? ''}</span>
                        <span className="sr-only">, {t('similarity_sr', { similarity: pct })}</span>
                      </span>
                      <span className="block h-1.5 bg-line/70" aria-hidden="true">
                        <span
                          className="land-around-fade block h-full origin-left bg-terra-600"
                          style={{ transform: `scaleX(${m.similarity})` }}
                        />
                      </span>
                      <span className="text-right text-xs tabular-nums text-ink-muted">
                        {value === null ? t('no_data') : t('value', { value: format.number(value / 1e6, { decimals: 1 }) })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-1.5 border-t border-line pt-3 text-[11px] leading-snug text-ink-muted">
              <p>{t('method', { name: ready.origin.name })}</p>
              {ready.skipped > 0 && <p>{t('skipped', { count: ready.skipped })}</p>}
              <p>{t('open_hint')}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
