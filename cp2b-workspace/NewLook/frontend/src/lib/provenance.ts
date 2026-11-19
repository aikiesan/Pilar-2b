/**
 * One vocabulary for where a number comes from, shared by the /explore
 * artifact, its seals and its downloads (docs/planning/EXPLORE_MAPA_PARA_FERRAMENTA.md, §5).
 *
 * The terms are the backend's BiomassCoverage, nothing added: in the artifact
 * each one is a byte (ind/<id>.bin, second array), and on screen a seal whose
 * words live in messages under `provenance.<key>`.
 *
 * Against Data_Biogas's seals, as the plan maps them: measured ↔ [V] and
 * partial ↔ [S] (here a floor, not a total). Its "declarado" and "suposto" have no
 * counterpart in the backend, so they are not mapped and no fifth term is
 * invented here; estimated and no_data carry no letter.
 */

import type { BiomassCoverage } from '@/types/geospatial';
import { aggregateCoverage } from './mapValues';

/** Byte → term, in the artifact's order: 0 measured, 1 estimated, 2 partial, 3 no data. */
export const PROVENANCE_BY_CODE: readonly BiomassCoverage[] = ['measured', 'estimated', 'partial', 'no_data'];

export const PROVENANCE_NO_DATA_CODE = 3;

export function provenanceFromCode(code: number): BiomassCoverage {
  const term = PROVENANCE_BY_CODE[code];
  if (term === undefined) throw new Error(`unknown provenance code ${code}`);
  return term;
}

export function provenanceCode(coverage: BiomassCoverage): number {
  return PROVENANCE_BY_CODE.indexOf(coverage);
}

/** The message key under `provenance.*` for a term (camelCase, as messages use). */
export type ProvenanceKey = 'measured' | 'estimated' | 'partial' | 'noData';

export function provenanceKey(coverage: BiomassCoverage): ProvenanceKey {
  return coverage === 'no_data' ? 'noData' : coverage;
}

/** Data_Biogas's seal letter for a term, where it has one. */
// i18n-exempt: seal codes from Data_Biogas, not copy
export const DATA_BIOGAS_SEAL: Readonly<Record<BiomassCoverage, 'V' | 'S' | null>> = {
  measured: 'V',
  estimated: null,
  partial: 'S',
  no_data: null,
};

/** Whether a value is only a floor ("parcial (piso)"): drawn with a dashed 1px stroke, never as a total. */
export function isFloor(coverage: BiomassCoverage): boolean {
  return coverage === 'partial';
}

/**
 * Provenance of a regional total (regions.json) from its municipalities' codes,
 * by the same rule as the map's sums: any part without data makes the total
 * partial — a floor, never a total.
 */
export function regionProvenance(codes: ArrayLike<number>): BiomassCoverage {
  return aggregateCoverage(Array.from(codes, provenanceFromCode));
}
