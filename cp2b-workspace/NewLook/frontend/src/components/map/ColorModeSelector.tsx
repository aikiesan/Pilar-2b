'use client';

/**
 * The choropleth colour-mode selector, shared by the desktop panel and the
 * mobile sheet. Those two kept byte-identical copies of this list, which is how
 * they drifted; one component now serves both.
 *
 * Beta modes (typology, regime, C:N) are shown only to a visitor with a real
 * backend token; without one they are left out, not shown locked, since they
 * are the group's method and stay behind sign-in. The data behind them is
 * 401-gated server-side as well. See lib/betaAccess.ts for why this is not
 * useAuth(). With a single mode left there is nothing to choose, so the
 * selector, title included, is not shown.
 */

import React from 'react';
import type { ColorMode } from '@/types/geospatial';
import { useBetaAccess } from '@/lib/betaAccess';

export interface ColorModeOption {
  value: ColorMode;
  label: string;
  beta: boolean;
}

/**
 * The one list of choropleth modes. The selector was shared to stop the desktop
 * and mobile copies drifting, but the option arrays stayed duplicated in both
 * callers — so they could still drift, and did: withdrawing a mode meant editing
 * two files. Both now call this.
 *
 * 'cn_profile' and 'regime' are SÃO PAULO ONLY, and that is a data fact, not a
 * product decision.
 *
 * Both read the N-additive blend C:N — ΣVS / Σ(VS/CN), the mass balance the
 * validation dossier declares. PR #213 withdrew them because what shipped was
 * the SV-weighted ARITHMETIC mean of the per-stream ratios, which is not the
 * C:N of a mixture and misclassified 31% of São Paulo. The corrected values
 * arrived with migration 031, from the dossier's own working set — but that set
 * covers the 645 SP municipalities and nothing else.
 *
 * So in the Minas Gerais scope these two modes are absent rather than empty.
 * Offering a control that paints nothing, or one that silently falls back to the
 * arithmetic value, would both be worse than not offering it: the first wastes
 * the reader's time, the second is the bug we just removed. MG returns when the
 * canonical pipeline is reprocessed with the N-additive balance and the sewage
 * stream — see docs/data/CNPQ_TYPOLOGY.md.
 *
 * 'tipologia' is SP+MG: it is the dominant residue family by VS share and never
 * touches the ratio, so the correction does not reach it.
 *
 * They stay beta-gated even though the numbers are now right, because the
 * dossier's Section 9 declares the limit — first-order spatial screening
 * candidates, not yield projections.
 */
export function buildColorModeOptions(
  biogasLabel: string,
  t: (key: 'colorModes.tipologia' | 'colorModes.cn_profile' | 'colorModes.regime') => string,
  scopeUf: 'SP' | 'MG' = 'SP',
): ColorModeOption[] {
  const options: ColorModeOption[] = [
    { value: 'biogas', label: biogasLabel, beta: false },
    { value: 'tipologia', label: t('colorModes.tipologia'), beta: true },
  ];
  if (scopeUf === 'SP') {
    options.push(
      { value: 'cn_profile', label: t('colorModes.cn_profile'), beta: true },
      { value: 'regime', label: t('colorModes.regime'), beta: true },
    );
  }
  return options;
}

interface ColorModeSelectorProps {
  /** The selector's title, shown above the modes. */
  label: string;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  options: ColorModeOption[];
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export default function ColorModeSelector({
  label,
  colorMode,
  onColorModeChange,
  options,
  variant = 'desktop',
  className,
}: ColorModeSelectorProps) {
  const hasBeta = useBetaAccess();
  const visible = hasBeta ? options : options.filter((o) => !o.beta);
  if (visible.length <= 1) return null;

  const sizing =
    variant === 'mobile'
      ? 'flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold'
      : 'w-full py-1 px-2.5 rounded-md text-[11px] font-semibold text-left flex items-center justify-between';

  return (
    <div className={className}>
      <p
        className={
          variant === 'mobile'
            ? 'mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted'
            : 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted'
        }
      >
        {label}
      </p>
      <div
        className={
          variant === 'mobile'
            ? 'flex flex-col gap-1 bg-paper-sunken p-2 rounded-xl border border-line'
            : 'flex flex-col gap-1 bg-paper-sunken p-1.5 rounded-lg border border-line'
        }
      >
        {visible.map((opt) => {
          const active = colorMode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onColorModeChange(opt.value)}
              className={`${sizing} transition-all ${
                active ? 'bg-terra-700 text-white shadow-sm' : 'text-ink hover:bg-line'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {opt.label}
                {opt.beta && (
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      active ? 'bg-paper-raised/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Beta
                  </span>
                )}
              </span>
              {active ? <span className="text-[10px]">✓</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
