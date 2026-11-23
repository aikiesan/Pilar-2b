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
 */
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Link } from '@/navigation';
import { loginHref } from '@/lib/authRedirect';
import { currentMapSearch, writeMapToolParams } from '@/lib/mapTools';
import type { BivariatePalette } from '@/lib/bivariate';
import { ANALYSES, ANALYSIS_IDS, type AnalysisId, type AnalysisResult } from '@/lib/mapAnalyses';
import type { MapToolAccess } from '@/lib/mapToolAccess';
import BivariateLegend, { MiniMatrix } from './BivariateLegend';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-1 focus-visible:ring-offset-paper';

export interface CrossPicked {
  name: string;
  /** Where it falls: a cell, no cell (a figure missing), or outside the state read. */
  status: 'cell' | 'no_data' | 'outside';
  cell: number | null;
}

export interface CrossWindowProps {
  access: MapToolAccess;
  active: AnalysisId | null;
  onChoose: (id: AnalysisId | null) => void;
  onClose: () => void;
  result: AnalysisResult | null;
  loading: boolean;
  failed: boolean;
  palette: BivariatePalette;
  /** The state the reading covers, by name. */
  stateLabel: string;
  picked: CrossPicked | null;
}

export default function CrossWindow({
  access, active, onChoose, onClose, result, loading, failed, palette, stateLabel, picked,
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

  return (
    <aside
      aria-label={t('window_aria')}
      className="surface-light absolute z-[1101] flex flex-col overflow-y-auto border-line bg-paper text-ink shadow-xl
                 inset-x-0 bottom-0 max-h-[60%] rounded-t-2xl border-t
                 landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-16 landscape:z-[999]
                 landscape:max-h-[calc(100%-5rem)] landscape:w-[340px] landscape:rounded-none landscape:border"
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

        {!gated && (
          <>
            {!active && <p className="text-sm text-ink-muted">{t('intro')}</p>}

            <div role="group" aria-label={t('choices_aria')} className="grid grid-cols-2 gap-1.5">
              {ANALYSIS_IDS.map((id) => {
                const on = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    disabled={access === 'loading'}
                    onClick={() => onChoose(on ? null : id)}
                    title={tA(`${id}.question`)}
                    className={`relative flex min-h-11 flex-col gap-1.5 border p-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${focusRing} ${
                      on
                        ? 'border-terra-600 bg-terra-50'
                        : 'border-line bg-paper-raised hover:border-line-strong hover:bg-paper-sunken active:bg-line/60'
                    }`}
                  >
                    <MiniMatrix answerCell={ANALYSES[id].answerCell} />
                    <span className="pr-4 text-xs font-semibold leading-tight text-ink">{tA(`${id}.title`)}</span>
                    <span className="text-[11px] leading-tight text-ink-muted">{tA(`${id}.axes`)}</span>
                    {on && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-terra-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {active && (
              <div key={active} className="tool-reveal border-t border-line pt-3">
                <BivariateLegend
                  id={active}
                  result={result}
                  loading={loading}
                  failed={failed}
                  palette={palette}
                  stateLabel={stateLabel}
                  bare
                  pickedCell={picked?.status === 'cell' ? picked.cell : null}
                />
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
          </>
        )}
      </div>
    </aside>
  );
}
