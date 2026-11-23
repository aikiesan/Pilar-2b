'use client';

/**
 * Cruzar dados: the floating window of the map's analysis tool. The four
 * ready-made analyses (lib/mapAnalyses.ts) as four questions; picking one
 * paints the map with its 3×3 bivariate colours, and the window shows the
 * reading under the choices: the matrix with its counts, the axes and their
 * breaks. A click on a municipality (or a search pick) marks its cell.
 *
 * Landscape (every desktop): a card on the right, under the control row.
 * Portrait (phones): a bottom sheet, like Compare and Land around. The legend
 * lives in here while the tool is open, so the sheet never covers it.
 *
 * Who may use it: useMapToolAccess. The figures behind the four are public
 * (the map's GeoJSON and /siting-indicators); the gate is the team's call
 * while the analyses are tested with approved accounts.
 *
 * Under the four, "Mais análises": the registry analyses GET /analyses gave
 * this account (`registry`). The server decides which; nothing here reads a
 * level. They are open even without a session (level 0 is all the API serves
 * then), so the gate above holds only the four, and a visitor without a
 * session always gets the call to sign in for more.
 */
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Link } from '@/navigation';
import { loginHref } from '@/lib/authRedirect';
import { currentMapSearch, writeMapToolParams } from '@/lib/mapTools';
import type { BivariatePalette } from '@/lib/bivariate';
import { ANALYSES, ANALYSIS_IDS, isAnalysisId, type AnalysisResult } from '@/lib/mapAnalyses';
import { builtInView, isRegistryRef, type AnalysisView, type MapAnalysisRef } from '@/lib/analysisRegistry';
import type { MapToolAccess } from '@/lib/mapToolAccess';
import BivariateLegend, { MiniMatrix } from './BivariateLegend';
import { MAP_WINDOW_CLASS } from './mapWindowShell';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

export interface CrossPicked {
  name: string;
  /** Where it falls: a cell, no cell (a figure missing), or outside the state read. */
  status: 'cell' | 'no_data' | 'outside';
  cell: number | null;
}

export interface CrossWindowProps {
  access: MapToolAccess;
  active: MapAnalysisRef | null;
  onChoose: (ref: MapAnalysisRef | null) => void;
  onClose: () => void;
  result: AnalysisResult | null;
  loading: boolean;
  failed: boolean;
  palette: BivariatePalette;
  /** The state the reading covers, by name. */
  stateLabel: string;
  picked: CrossPicked | null;
  /** The registry analyses this account may see, as the API listed them. */
  registry?: readonly AnalysisView[];
  /** A linked ?a=r:<id> that is malformed or that this account may not see. */
  unavailable?: boolean;
}

export default function CrossWindow({
  access, active, onChoose, onClose, result, loading, failed, palette, stateLabel, picked,
  registry = [], unavailable = false,
}: CrossWindowProps) {
  const t = useTranslations('Map.cross');
  const tA = useTranslations('Map.analyses');
  const tTools = useTranslations('Map.mapTools');
  const gated = access === 'sign_in' || access === 'pending';
  // Built from the map's own link, so the scope, scenario and filters come back too.
  const loginParams = writeMapToolParams(currentMapSearch(), { tool: 'cross' });
  if (active) loginParams.set('a', active);
  else loginParams.delete('a');
  const loginNext = `/map?${loginParams.toString()}`;
  const signedOut = access === 'sign_in';
  const activeIsRegistry = active !== null && isRegistryRef(active);
  const activeView: AnalysisView | null = !active
    ? null
    : isAnalysisId(active) ? builtInView(active, tA) : (registry.find((v) => v.ref === active) ?? null);
  // A built-in's reading waits for the access check (until then its result is
  // not asked for, and its loading line would mislead); a registry one is
  // whatever the API served this session.
  const showReading = active !== null && (activeIsRegistry || access === 'allowed');

  const choice = (view: AnalysisView, axes: string) => {
    const on = active === view.ref;
    return (
      <button
        key={view.ref}
        type="button"
        aria-pressed={on}
        disabled={access === 'loading'}
        onClick={() => onChoose(on ? null : view.ref)}
        title={view.question}
        className={`relative flex min-h-11 flex-col gap-1.5 border p-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
          on
            ? 'border-terra-600 bg-terra-50'
            : 'border-line bg-paper-raised hover:border-line-strong hover:bg-paper-sunken active:bg-line/60'
        }`}
      >
        <MiniMatrix answerCell={view.answerCell} />
        <span className="pr-4 text-xs font-semibold leading-tight text-ink">{view.title}</span>
        <span className="text-[11px] leading-tight text-ink-muted">{axes}</span>
        {on && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-terra-600" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <aside
      aria-label={t('window_aria')}
      className={MAP_WINDOW_CLASS}
    >
      <div className="flex justify-center pt-2 landscape:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
      </div>

      <header className="flex items-start gap-2 px-4 pb-2 pt-1 landscape:pt-3">
        <h2 className="min-w-0 flex-1 font-display text-lg font-bold leading-snug text-ink">{t('title')}</h2>
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

      <div className="space-y-3 px-4 pb-4">
        {unavailable && (
          <p role="status" className="text-sm text-ink-muted">{tA('registry_unavailable')}</p>
        )}

        {signedOut && (
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

        {!gated && (
          <>
            {!active && <p className="text-sm text-ink-muted">{t('intro')}</p>}

            <div role="group" aria-label={t('choices_aria')} className="grid grid-cols-2 gap-1.5">
              {ANALYSIS_IDS.map((id) => choice(builtInView(id, tA), tA(`${id}.axes`)))}
            </div>
          </>
        )}

        {(registry.length > 0 || signedOut) && (
          <section aria-labelledby="cross-registry-h" className="space-y-1.5">
            <h3 id="cross-registry-h" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {tA('registry_section')}
            </h3>
            {registry.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {registry.map((view) => choice(view, `${view.xLabel} × ${view.yLabel}`))}
              </div>
            )}
            {signedOut && (
              <Link
                href={loginHref(loginNext)}
                className={`inline-flex min-h-11 items-center text-sm font-medium text-terra-800 underline-offset-2 hover:underline ${focusRing}`}
              >
                {tA('registry_more_with_login')}
              </Link>
            )}
          </section>
        )}

        {showReading && (
          <div key={active} className="tool-reveal border-t border-line pt-3">
            {activeView ? (
              <BivariateLegend
                view={activeView}
                result={result}
                loading={loading}
                failed={failed}
                palette={palette}
                stateLabel={stateLabel}
                bare
                pickedCell={picked?.status === 'cell' ? picked.cell : null}
              />
            ) : (
              // The registry list is still on its way.
              <p role="status" className="text-xs text-ink-muted">{tA('loading')}</p>
            )}
            <p className="mt-2 text-xs leading-snug text-ink-muted" aria-live="polite">
              {!picked
                ? t('pick_hint')
                : picked.status === 'cell'
                  ? t('picked', { name: picked.name })
                  : picked.status === 'no_data'
                    ? t('picked_no_data', { name: picked.name })
                    : t('picked_outside', { name: picked.name, state: stateLabel })}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
