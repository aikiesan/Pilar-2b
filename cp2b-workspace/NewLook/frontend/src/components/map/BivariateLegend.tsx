'use client';

/**
 * Legend for a bivariate analysis: the 3×3 matrix with the municipality count
 * in each cell, the two axes with their breaks, and the cell that answers the
 * analysis's question outlined. Sits where the choropleth legend sits, or,
 * bare, inside the Cruzar window, which then marks the clicked municipality's
 * cell too.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useFormat } from '@/hooks/useFormat';
import { BIVARIATE_FILLS, bivariateFills, cellInk, type BivariatePalette } from '@/lib/bivariate';
import { ANALYSES, isAnalysisId, type AnalysisResult, type AxisDef, type Breaks } from '@/lib/mapAnalyses';
import type { AnalysisView } from '@/lib/analysisRegistry';

interface Props {
  /** What to draw, built-in or from the registry (lib/analysisRegistry.ts). */
  view: AnalysisView;
  result: AnalysisResult | null;
  loading?: boolean;
  failed?: boolean;
  palette?: BivariatePalette;
  stateLabel: string;
  /** Without one, no close button (the Cruzar window closes itself). */
  onClose?: () => void;
  /** No card of its own: it sits inside a window. */
  bare?: boolean;
  /** A cell to mark besides the answer: the municipality the visitor picked. */
  pickedCell?: number | null;
}

/** The nine fills as a thumbnail, the answer cell outlined. */
export function MiniMatrix({ answerCell, size = 'h-2 w-2' }: { answerCell: number; size?: string }) {
  return (
    <span className="grid w-max grid-cols-3 gap-px" aria-hidden="true">
      {[2, 1, 0].map((cy) =>
        [0, 1, 2].map((cx) => {
          const cell = cy * 3 + cx;
          return (
            <span
              key={cell}
              className={`${size} ${cell === answerCell ? 'outline outline-1 outline-ink' : ''}`}
              style={{ backgroundColor: BIVARIATE_FILLS[cell] }}
            />
          );
        })
      )}
    </span>
  );
}

export default function BivariateLegend({
  view, result, loading, failed, palette = 'default', stateLabel, onClose, bare = false, pickedCell = null,
}: Props) {
  const t = useTranslations('Map.analyses');
  const format = useFormat();
  // A built-in knows its axes' units and methods; a registry analysis is
  // served as cuts only, so its breaks read as plain tertile bounds.
  const def = isAnalysisId(view.ref) ? ANALYSES[view.ref] : null;
  const fills = bivariateFills(palette);

  /** A break in the axis's own unit. */
  const value = (axis: AxisDef, v: number): string => {
    switch (axis.key) {
      case 'plants':
        return format.number(v);
      case 'pipeline':
        return `${format.number(Math.round(v))} km`;
      case 'loss':
        return format.percent(v * 100, { decimals: 0 });
      default:
        return format.compact(v);
    }
  };
  /** The three class labels of an axis, weakest first. */
  const classLabels = (axis: AxisDef | null, breaks: Breaks | null, invert: boolean): [string, string, string] => {
    if (axis?.method === 'fixed_count') return ['0', '1', '2+'];
    if (!breaks) return ['', '', ''];
    const [a, b] = breaks.map((v) => (axis ? value(axis, v) : format.compact(v)));
    // Inverted (distance): the strongest class is the smallest value.
    return invert ? [`≥ ${b}`, `${a}–${b}`, `< ${a}`] : [`< ${a}`, `${a}–${b}`, `≥ ${b}`];
  };

  // The view carries the direction for built-ins and registry analyses alike.
  const xLabels = classLabels(def?.x ?? null, result?.xBreaks ?? null, view.xInvert);
  const yLabels = classLabels(def?.y ?? null, result?.yBreaks ?? null, view.yInvert);
  const answer = result ? result.counts[view.answerCell] : null;

  return (
    <section
      aria-label={view.title}
      className={bare ? 'text-ink' : 'surface-light w-[260px] border border-line bg-paper-raised/95 p-3 text-ink shadow-md backdrop-blur'}
    >
      <header className="mb-2 flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug">{view.question}</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            title={t('close')}
            className="-mr-3 -mt-3 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink active:bg-line/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </header>

      {failed ? (
        <p role="alert" className="text-xs text-red-700">{t('failed')}</p>
      ) : loading || !result ? (
        <p role="status" className="text-xs text-ink-muted">{t('loading')}</p>
      ) : (
        <>
          <div className="flex gap-2">
            {/* y axis: title rotated, class labels top (strong) to bottom (weak) */}
            <div className="flex items-stretch gap-1">
              <span className="flex w-4 items-center justify-center">
                <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold text-ink-muted">
                  {view.yLabel} ↑
                </span>
              </span>
              <div className="flex flex-col gap-px text-right text-[10px] tabular-nums leading-none text-ink-muted">
                {[2, 1, 0].map((c) => (
                  <span key={c} className="flex h-9 items-center justify-end">{yLabels[c]}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-px" role="table" aria-label={t('matrix_aria')}>
                {[2, 1, 0].map((cy) =>
                  [0, 1, 2].map((cx) => {
                    const cell = cy * 3 + cx;
                    const isAnswer = cell === view.answerCell;
                    const isPicked = cell === pickedCell;
                    return (
                      <span
                        key={cell}
                        role="cell"
                        aria-label={t('cell_aria', { x: xLabels[cx], y: yLabels[cy], count: result.counts[cell] })}
                        data-picked={isPicked || undefined}
                        className={`relative flex h-9 w-9 items-center justify-center text-[10px] font-semibold tabular-nums ${isAnswer ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                        style={{ backgroundColor: fills[cell], color: cellInk(fills[cell]) }}
                      >
                        {result.counts[cell]}
                        {/* The picked municipality: a dot in the cell's ink, so it
                            reads on every fill and next to the answer's ring. */}
                        {isPicked && (
                          <span
                            aria-hidden="true"
                            className="bivar-picked absolute right-0.5 top-0.5 h-2 w-2 rounded-full"
                            style={{ backgroundColor: cellInk(fills[cell]) }}
                          />
                        )}
                      </span>
                    );
                  })
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 text-center text-[10px] tabular-nums leading-tight text-ink-muted">
                {xLabels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              <p className="mt-0.5 text-center text-[10px] font-semibold text-ink-muted">{view.xLabel} →</p>
            </div>
          </div>

          <p className="mt-2 text-xs leading-snug">
            {def ? (
              <>{t.rich('answer', { count: answer ?? 0, b: (c) => <b>{c}</b> })} {view.answer}</>
            ) : (
              // The registry has no answer of its own: the count, then the generic line.
              <><b>{format.number(answer ?? 0)}</b> {view.answer}</>
            )}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-ink-muted">
            {t('method', { state: stateLabel })}
            {def && (def.x.method === 'fixed_count' || def.y.method === 'fixed_count') && ` ${t('method_plants')}`}
            {result.noData > 0 && ` ${t('no_data', { count: result.noData })}`}
          </p>
          {/* The registry's own source line; '' when the analysis has none. */}
          {view.source && <p className="mt-1 text-[10px] leading-snug text-ink-muted">{view.source}</p>}
        </>
      )}
    </section>
  );
}
