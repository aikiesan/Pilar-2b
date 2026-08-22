/**
 * Geographic scope of the public platform — canonical SP plus the MG pilot.
 *
 * The public map serves the 645 municipalities in São Paulo plus the 853 in the
 * Minas Gerais pilot. SP remains the canonical FDE-audited scope. MG publishes
 * reviewed PAM, PPM and FORSU/SNIS activity while keeping its pilot status and
 * explicitly withholding streams that are still under validation.
 *
 * So the two are ONE dataset with TWO confidence levels, and the map has to say
 * so visually rather than in a footnote. Everything that needs to tell them
 * apart reads this module, so the rule lives in exactly one place.
 *
 * The rule itself is the IBGE convention: the first two digits of a 7-digit
 * municipal code are the UF code, and São Paulo is 35. No `uf` column is served
 * in the map payload, and adding one would cost 5,571 repeated key names in a
 * payload already dominated by key repetition — the prefix is free.
 */

/** IBGE UF code for São Paulo. */
export const SP_UF_CODE = '35';
export const MG_UF_CODE = '31';

/** Municipalities in São Paulo (IBGE 2023 / the canonical pipeline's universe). */
export const SP_MUNICIPALITY_COUNT = 645;
export const MG_MUNICIPALITY_COUNT = 853;

/**
 * True when the IBGE code belongs to São Paulo.
 *
 * Accepts the number|string union the API actually serves. A code that is
 * missing, malformed, or shorter than 7 digits is treated as NOT São Paulo.
 * Callers that style a specific pilot state must also test isMinasGerais rather
 * than assuming every non-SP code belongs to MG.
 */
export function isSaoPaulo(ibgeCode: string | number | null | undefined): boolean {
  if (ibgeCode === null || ibgeCode === undefined) return false;
  const code = String(ibgeCode).trim();
  return code.length === 7 && code.startsWith(SP_UF_CODE);
}

export function isMinasGerais(ibgeCode: string | number | null | undefined): boolean {
  if (ibgeCode === null || ibgeCode === undefined) return false;
  const code = String(ibgeCode).trim();
  return code.length === 7 && code.startsWith(MG_UF_CODE);
}

export function isPublicMapMunicipality(
  ibgeCode: string | number | null | undefined
): boolean {
  return isSaoPaulo(ibgeCode) || isMinasGerais(ibgeCode);
}

/** Layer id retained for the MG pilot overlay, still presented as beta. */
export const MG_BETA_LAYER_ID = 'mg-beta';

/**
 * Fill for an unpainted MG pilot municipality: a flat, desaturated slate that sits clearly
 * outside the YlGnBu ramp, so a beta polygon can never be read as a ramp value.
 * Distinct from NO_DATA_FILL (#cbd5e1) — "not validated yet" and "never loaded"
 * are different facts and stay visually different.
 */
export const BETA_FILL = '#94a3b8';
export const BETA_STROKE = '#64748b';
/** State-specific municipal outline used while MG carries an active data ramp. */
export const MG_DATA_STROKE = '#1d4ed8';

/**
 * Context style for MG polygons when their quantitative ramp is disabled.
 * fillOpacity does NOT follow the opacity slider because this style represents
 * context rather than data under inspection.
 */
export const BETA_STYLE = {
  fillColor: BETA_FILL,
  weight: 0.3,
  opacity: 0.35,
  color: BETA_STROKE,
  fillOpacity: 0.18,
} as const;

/** Shown wherever an MG pilot value is surfaced (tooltip, profile panel, legend). */
export const BETA_NOTICE =
  'Minas Gerais — piloto beta. PAM 2023, PPM 2024, Censo 2022 e FORSU/SNIS-RS ' +
  '2022 promovidos; poda urbana e lodo de ETE permanecem em validação.';

/** Compact variant for tooltips and badges, where the full sentence does not fit. */
export const BETA_BADGE_LABEL = 'BETA — em validação';
