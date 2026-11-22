'use client';

/**
 * Legend for a bivariate analysis: the 3×3 matrix with the municipality count
 * in each cell, the two axes with their breaks, and the cell that answers the
 * analysis's question outlined. Sits where the choropleth legend sits.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useFormat } from '@/hooks/useFormat';
import { bivariateFills, cellInk, type BivariatePalette } from '@/lib/bivariate';
import { ANALYSES, type AnalysisResult, type AxisDef, type Breaks } from '@/lib/mapAnalyses';
import type { AnalysisId } from '@/lib/mapAnalyses';

interface Props {
  id: AnalysisId;
  result: AnalysisResult | null;
  loading?: boolean;
  failed?: boolean;
  palette?: BivariatePalette;
  stateLabel: string;
  onClose: () => void;
}

export default function BivariateLegend({ id, result, loading, failed, palette = 'default', stateLabel, onClose }: Props) {
  const t = useTranslations('Map.analyses');
  const format = useFormat();
  const def = ANALYSES[id];
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
  const classLabels = (axis: AxisDef, breaks: Breaks | null): [string, string, string] => {
    if (axis.method === 'fixed_count') return ['0', '1', '2+'];
    if (!breaks) return ['', '', ''];
    const [a, b] = breaks.map((v) => value(axis, v));
    // Inverted (distance): the strongest class is the smallest value.
    return axis.invert ? [`≥ ${b}`, `${a}–${b}`, `< ${a}`] : [`< ${a}`, `${a}–${b}`, `≥ ${b}`];
  };

  const xLabels = classLabels(def.x, result?.xBreaks ?? null);
  const yLabels = classLabels(def.y, result?.yBreaks ?? null);
  const answer = result ? result.counts[def.answerCell] : null;

  return (
    <section
      aria-label={t(`${id}.title`)}
      className="surface-light w-[260px] border border-line bg-paper-raised/95 p-3 text-ink shadow-md backdrop-blur"
    >
      <header className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{t('legend_kicker', { state: stateLabel })}</p>
          <h3 className="text-sm font-bold leading-snug">{t(`${id}.question`)}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          title={t('close')}
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-paper-sunken hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
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
                  {t(`axes.${def.y.key}`)} ↑
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
                    const isAnswer = cell === def.answerCell;
                    return (
                      <span
                        key={cell}
                        role="cell"
                        aria-label={t('cell_aria', { x: xLabels[cx], y: yLabels[cy], count: result.counts[cell] })}
                        className={`flex h-9 w-9 items-center justify-center text-[10px] font-semibold tabular-nums ${isAnswer ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                        style={{ backgroundColor: fills[cell], color: cellInk(fills[cell]) }}
                      >
                        {result.counts[cell]}
                      </span>
                    );
                  })
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 text-center text-[10px] tabular-nums leading-tight text-ink-muted">
                {xLabels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              <p className="mt-0.5 text-center text-[10px] font-semibold text-ink-muted">{t(`axes.${def.x.key}`)} →</p>
            </div>
          </div>

          <p className="mt-2 text-xs leading-snug">
            {t.rich('answer', { count: answer ?? 0, b: (c) => <b>{c}</b> })} {t(`${id}.answer`)}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-ink-muted">
            {t('method')}
            {(def.x.method === 'fixed_count' || def.y.method === 'fixed_count') && ` ${t('method_plants')}`}
            {result.noData > 0 && ` ${t('no_data', { count: result.noData })}`}
          </p>
        </>
      )}
    </section>
  );
}
