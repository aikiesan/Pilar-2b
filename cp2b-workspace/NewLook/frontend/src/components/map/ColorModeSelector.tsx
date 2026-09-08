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
 * WITHDRAWN — 'cn_profile' and 'regime'.
 *
 * Both are functions of `municipality_typology.cn_molar`, which the canonical
 * pipeline computes as the SV-weighted ARITHMETIC mean of the per-stream C:N
 * ratios. That is not the C:N of a mixture. Nitrogen is additive, so the blend
 * ratio is ΣSV / Σ(SV/CN) — the mass balance the project's own validation
 * dossier declares as the method ("balanço N-aditivo"), and which the shipped
 * numbers do not use.
 *
 * Measured over the 1498 loaded municipalities: cn_molar runs a median 1.43×
 * high (SP median 53.1 against a corrected 36.8), and `regime` — a pure
 * threshold on it (equilibrado = 20 ≤ cn ≤ 30) — misclassifies 661 of them,
 * 44%. The C-dominant/N-dominant reading of the territory inverts. The dossier's
 * own "before" figure for SP, 111 balanced municipalities, is exactly what this
 * data yields, so what shipped is the state that document describes as
 * superseded.
 *
 * 'tipologia' stays: it is the dominant residue family by VS share and never
 * touches the ratio.
 *
 * Restoring these needs a corrected snapshot, not a code change here — see
 * docs/data/CNPQ_TYPOLOGY.md. The loader now refuses a snapshot whose cn_molar
 * matches the arithmetic mean, so this cannot silently come back.
 */
export function buildColorModeOptions(
  biogasLabel: string,
  t: (key: string) => string,
): ColorModeOption[] {
  return [
    { value: 'biogas', label: biogasLabel, beta: false },
    { value: 'tipologia', label: t('colorModes.tipologia'), beta: true },
  ];
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
