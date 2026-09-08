'use client';

/**
 * The choropleth colour-mode selector, shared by the desktop panel and the
 * mobile sheet. Those two kept byte-identical copies of this list, which is how
 * they drifted; one component now serves both.
 *
 * Beta modes (typology, regime, C:N) are locked until the visitor holds a real
 * backend token. The lock is honest about what it is: the data behind these
 * modes is 401-gated server-side, so a locked user cannot fetch it even by
 * editing the DOM. See lib/betaAccess.ts for why this is not useAuth().
 */

import React from 'react';
import { Lock } from 'lucide-react';
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
  t: (key: string) => string,
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
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  options: ColorModeOption[];
  /** Copy for the locked-state note. */
  lockedHint: string;
  variant?: 'desktop' | 'mobile';
}

export default function ColorModeSelector({
  colorMode,
  onColorModeChange,
  options,
  lockedHint,
  variant = 'desktop',
}: ColorModeSelectorProps) {
  const hasBeta = useBetaAccess();
  const anyLocked = options.some((o) => o.beta) && !hasBeta;

  const sizing =
    variant === 'mobile'
      ? 'flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold'
      : 'w-full py-1 px-2.5 rounded-md text-[11px] font-semibold text-left flex items-center justify-between';

  return (
    <>
      <div
        className={
          variant === 'mobile'
            ? 'flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-200'
            : 'flex flex-col gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200'
        }
      >
        {options.map((opt) => {
          const locked = opt.beta && !hasBeta;
          const active = colorMode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={locked}
              aria-disabled={locked}
              title={locked ? lockedHint : undefined}
              onClick={() => !locked && onColorModeChange(opt.value)}
              className={`${sizing} transition-all ${
                active
                  ? 'bg-green-700 text-white shadow-sm'
                  : locked
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {opt.label}
                {opt.beta && (
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Beta
                  </span>
                )}
              </span>
              {locked ? <Lock className="h-3 w-3 shrink-0" /> : active ? <span className="text-[10px]">✓</span> : null}
            </button>
          );
        })}
      </div>
      {anyLocked && (
        <p className="mt-1.5 text-[10px] leading-snug text-gray-500">{lockedHint}</p>
      )}
    </>
  );
}
