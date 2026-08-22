/**
 * Geographic scope of the public platform — canonical SP plus the MG pilot.
 *
 * The map serves 5,571 municipalities, but only the 645 in São Paulo carry
 * numbers that have been through the canonical pipeline and the FDE audit.
 * The national rows exist, are loaded, and are still being validated: sugarcane
 * runs on a national mill-delivery ratio pending per-state moagem, several crop
 * streams have open methodology questions, and no national equivalent of the
 * SP master residue table has been reconciled yet.
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
 * missing, malformed, or shorter than 7 digits is treated as NOT São Paulo:
 * the beta styling is the conservative default, so a bad code degrades into
 * "shown as unvalidated" rather than into "presented as canonical".
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

/** Layer id for the national (non-SP) municipalities, still in validation. */
export const MG_BETA_LAYER_ID = 'mg-beta';

/**
 * Fill for a non-SP municipality: a flat, desaturated slate that sits clearly
 * outside the YlGnBu ramp, so a beta polygon can never be read as a ramp value.
 * Distinct from NO_DATA_FILL (#cbd5e1) — "not validated yet" and "never loaded"
 * are different facts and stay visually different.
 */
export const BETA_FILL = '#94a3b8';
export const BETA_STROKE = '#64748b';

/**
 * Style for non-SP polygons. Deliberately low contrast and thin-stroked: SP
 * must win the visual hierarchy at every zoom level. fillOpacity does NOT
 * follow the opacity slider — the slider tunes the choropleth being read, and
 * the beta layer is context, not data under inspection.
 */
export const BETA_STYLE = {
  fillColor: BETA_FILL,
  weight: 0.3,
  opacity: 0.35,
  color: BETA_STROKE,
  fillOpacity: 0.18,
} as const;

/** Shown wherever a non-SP value is surfaced (tooltip, profile panel, legend). */
export const BETA_NOTICE =
  'Minas Gerais — piloto beta. PAM agrícola promovida; pecuária e resíduos ' +
  'urbanos aguardam promoção e validação das fontes.';

/** Compact variant for tooltips and badges, where the full sentence does not fit. */
export const BETA_BADGE_LABEL = 'BETA — em validação';
