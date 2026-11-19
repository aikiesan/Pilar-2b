/**
 * Reading the static /explore artifact (public/bivar/v1/, written by
 * backend/scripts/build_bivariate_artifacts.py; docs/planning/EXPLORE_MAPA_PARA_FERRAMENTA.md, §1).
 *
 * Every array is aligned to order.json: position i is the same municipality in
 * every indicator and in the geometry, with no lookup table. That makes an
 * off-by-one paint the wrong municipality without any visible error, so every
 * parser here checks sizes and invariants and throws rather than misalign.
 *
 * ind/<id>.bin, N = order.length, little-endian:
 *
 *   offset  length  type     meaning
 *   0       N       uint8    class 0,1,2; 253 measured zero; 255 no data
 *   N       N       uint8    provenance 0 measured, 1 estimated, 2 partial, 3 no data
 *   2N      4N      float32  value in display units, NaN when there is no data
 *
 * Invariants: class 255 ⇔ provenance 3 ⇔ NaN; class 253 ⇒ value 0. The
 * generator classifies the float32-rounded value, so classifyValue on what is
 * stored gives back the stored class (see checkClasses).
 */

import { CLASS_METHODS, CLASS_NO_DATA, CLASS_ZERO, classifyValue, type Breaks, type ClassMethod } from './bivariate';
import { PROVENANCE_BY_CODE, PROVENANCE_NO_DATA_CODE } from './provenance';

/** Where the artifact is served, under the app's base path. */
export const BIVARIATE_ARTIFACT_DIR = 'bivar/v1';

/** Bytes per municipality in an indicator file: class + provenance + float32. */
export const INDICATOR_BYTES_PER_MUNICIPALITY = 6;

export interface IndicatorArrays {
  classes: Uint8Array;
  provenance: Uint8Array;
  values: Float32Array;
}

export interface IndicatorClasses {
  method: ClassMethod;
  breaks: Breaks;
  /** Display unit, as a key under `units.*`. */
  unit: string;
}

export interface CuratedPair {
  x: string;
  y: string;
  /** Spearman's ρ the generator measured over the municipalities with both values. */
  rho: number;
}

/** The part of classes.json the client relies on; extra fields (statistics, sources) pass through. */
export interface ClassesFile {
  indicators: Record<string, IndicatorClasses>;
  pairs: Record<string, CuratedPair>;
}

class ArtifactError extends Error {
  constructor(file: string, message: string) {
    super(`${BIVARIATE_ARTIFACT_DIR}/${file}: ${message}`);
    this.name = 'ArtifactError';
  }
}

const IBGE_CODE = /^\d{7}$/;

/** order.json: the IBGE codes, ascending, each once. Its length is N for every other file. */
export function parseOrder(json: unknown): string[] {
  if (!Array.isArray(json) || json.length === 0) throw new ArtifactError('order.json', 'expected a non-empty array');
  for (let i = 0; i < json.length; i++) {
    const code = json[i];
    if (typeof code !== 'string' || !IBGE_CODE.test(code)) {
      throw new ArtifactError('order.json', `position ${i} is not a 7-digit IBGE code: ${JSON.stringify(code)}`);
    }
    // Same length, so string order is numeric order; strictly ascending also rules out repeats.
    if (i > 0 && code <= json[i - 1]) {
      throw new ArtifactError('order.json', `not strictly ascending at position ${i} (${json[i - 1]}, ${code})`);
    }
  }
  return json as string[];
}

/** ind/<id>.bin for N municipalities. Throws on a wrong size or any broken invariant. */
export function parseIndicator(buffer: ArrayBuffer, n: number, id = '?'): IndicatorArrays {
  const file = `ind/${id}.bin`;
  const expected = n * INDICATOR_BYTES_PER_MUNICIPALITY;
  if (buffer.byteLength !== expected) {
    throw new ArtifactError(file, `${buffer.byteLength} bytes, expected ${expected} for ${n} municipalities`);
  }
  const classes = new Uint8Array(buffer, 0, n);
  const provenance = new Uint8Array(buffer, n, n);
  // 2N is not 4-aligned for odd N, so a Float32Array cannot view the buffer in
  // place; read through a DataView, which also pins the byte order.
  const view = new DataView(buffer, 2 * n, 4 * n);
  const values = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const cls = classes[i];
    const prov = provenance[i];
    const value = view.getFloat32(4 * i, true);
    values[i] = value;
    if (cls > 2 && cls !== CLASS_ZERO && cls !== CLASS_NO_DATA) {
      throw new ArtifactError(file, `position ${i}: class byte ${cls} is not defined`);
    }
    if (prov >= PROVENANCE_BY_CODE.length) {
      throw new ArtifactError(file, `position ${i}: provenance byte ${prov} is not defined`);
    }
    const noClass = cls === CLASS_NO_DATA;
    const noProv = prov === PROVENANCE_NO_DATA_CODE;
    const noValue = Number.isNaN(value);
    if (noClass !== noProv || noClass !== noValue) {
      throw new ArtifactError(
        file,
        `position ${i}: no-data markers disagree (class ${cls}, provenance ${prov}, value ${value})`,
      );
    }
    if (!noValue && !Number.isFinite(value)) throw new ArtifactError(file, `position ${i}: value ${value}`);
    if (cls === CLASS_ZERO && value !== 0) {
      throw new ArtifactError(file, `position ${i}: class ${CLASS_ZERO} (measured zero) with value ${value}`);
    }
  }
  return { classes: new Uint8Array(classes), provenance: new Uint8Array(provenance), values };
}

function isBreaks(b: unknown): b is Breaks {
  return (
    Array.isArray(b) &&
    b.length === 2 &&
    b.every((v) => typeof v === 'number' && Number.isFinite(v)) &&
    (b[0] as number) <= (b[1] as number)
  );
}

/** classes.json: method and breaks per indicator, and the curated pairs with their ρ. */
export function parseClasses(json: unknown): ClassesFile {
  const fail = (m: string): never => {
    throw new ArtifactError('classes.json', m);
  };
  if (typeof json !== 'object' || json === null) fail('expected an object');
  const { indicators, pairs } = json as Record<string, unknown>;
  if (typeof indicators !== 'object' || indicators === null) fail('missing "indicators"');
  if (typeof pairs !== 'object' || pairs === null) fail('missing "pairs"');

  for (const [id, spec] of Object.entries(indicators as Record<string, unknown>)) {
    const s = spec as Partial<IndicatorClasses> | null;
    if (!s || !CLASS_METHODS.includes(s.method as ClassMethod)) fail(`indicator ${id}: unknown method ${s?.method}`);
    if (!isBreaks(s!.breaks)) fail(`indicator ${id}: breaks must be two ascending finite numbers`);
    if (typeof s!.unit !== 'string' || !s!.unit) fail(`indicator ${id}: missing unit`);
  }
  const known = indicators as Record<string, IndicatorClasses>;
  for (const [id, pair] of Object.entries(pairs as Record<string, unknown>)) {
    const p = pair as Partial<CuratedPair> | null;
    if (!p || typeof p.x !== 'string' || !(p.x in known)) fail(`pair ${id}: x is not a listed indicator`);
    if (typeof p!.y !== 'string' || !(p!.y in known)) fail(`pair ${id}: y is not a listed indicator`);
    if (p!.x === p!.y) fail(`pair ${id}: x and y are the same indicator`);
    if (typeof p!.rho !== 'number' || !(Math.abs(p!.rho) <= 1)) fail(`pair ${id}: rho must be in [-1, 1]`);
  }
  return json as ClassesFile;
}

/**
 * Whether the stored classes are what the stated breaks give for the stored
 * values: the generator and the client agree on every boundary. Returns the
 * first position that disagrees, or -1.
 */
export function checkClasses(arrays: IndicatorArrays, spec: IndicatorClasses): number {
  for (let i = 0; i < arrays.classes.length; i++) {
    const v = arrays.values[i];
    if (classifyValue(Number.isNaN(v) ? null : v, spec.breaks, spec.method) !== arrays.classes[i]) return i;
  }
  return -1;
}

/** municipios.geo.json must list its features in order.json's order: features[i] ↔ order[i]. */
export function assertGeometryOrder(order: readonly string[], featureCodes: readonly string[]): void {
  if (featureCodes.length !== order.length) {
    throw new ArtifactError('municipios.geo.json', `${featureCodes.length} features, expected ${order.length}`);
  }
  for (let i = 0; i < order.length; i++) {
    if (featureCodes[i] !== order[i]) {
      throw new ArtifactError('municipios.geo.json', `feature ${i} is ${featureCodes[i]}, order.json has ${order[i]}`);
    }
  }
}
