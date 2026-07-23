/**
 * Brazilian states (UFs) for the map scope switcher.
 *
 * São Paulo (35) is the project's research focus and the default scope. Each
 * entry carries a map center + zoom so switching scope reframes the view, and
 * an `hasResidueBreakdown` flag: only SP currently ships the full per-residue
 * biomass breakdown (sugarcane/soybean/…); the rest of Brazil carries the
 * aggregate agricultural/livestock/urban bands (IBGE PAM + measured urban
 * waste). The map uses this flag to gate the per-residue filters honestly
 * instead of silently blanking outside SP.
 *
 * A municipality's UF is the first two digits of its 7-digit IBGE code, so no
 * separate `uf` field is needed on the features — `String(ibge_code).slice(0,2)`.
 */

export const SAO_PAULO_UF = '35';

/** Special scope value meaning "the whole country" (no UF filter). */
export const SCOPE_BRAZIL = 'BR';

export type MapScope = string; // a 2-digit UF code, or SCOPE_BRAZIL

export interface BrazilState {
  /** 2-digit IBGE UF code (matches the first two digits of the municipality code). */
  code: string;
  /** Two-letter abbreviation, e.g. "SP". */
  sigla: string;
  /** Full Portuguese name. */
  nome: string;
  /** Map center [lat, lng]. */
  center: [number, number];
  /** Leaflet zoom that frames the state reasonably. */
  zoom: number;
  /** Region grouping, for optional grouping in the switcher. */
  regiao: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  /** True only where the full per-residue biomass breakdown exists (SP today). */
  hasResidueBreakdown: boolean;
}

// Center for the "all of Brazil" scope.
export const BRAZIL_CENTER: [number, number] = [-15.0, -53.0];
export const BRAZIL_ZOOM = 4;

export const BRAZIL_STATES: BrazilState[] = [
  // Norte
  { code: '11', sigla: 'RO', nome: 'Rondônia', center: [-10.9, -63.3], zoom: 6, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '12', sigla: 'AC', nome: 'Acre', center: [-9.0, -70.5], zoom: 6, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '13', sigla: 'AM', nome: 'Amazonas', center: [-4.5, -64.0], zoom: 5, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '14', sigla: 'RR', nome: 'Roraima', center: [2.0, -61.4], zoom: 6, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '15', sigla: 'PA', nome: 'Pará', center: [-4.0, -52.5], zoom: 5, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '16', sigla: 'AP', nome: 'Amapá', center: [1.5, -51.8], zoom: 6, regiao: 'Norte', hasResidueBreakdown: false },
  { code: '17', sigla: 'TO', nome: 'Tocantins', center: [-10.2, -48.3], zoom: 6, regiao: 'Norte', hasResidueBreakdown: false },
  // Nordeste
  { code: '21', sigla: 'MA', nome: 'Maranhão', center: [-5.0, -45.3], zoom: 6, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '22', sigla: 'PI', nome: 'Piauí', center: [-7.5, -42.7], zoom: 6, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '23', sigla: 'CE', nome: 'Ceará', center: [-5.2, -39.5], zoom: 6, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '24', sigla: 'RN', nome: 'Rio Grande do Norte', center: [-5.8, -36.6], zoom: 7, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '25', sigla: 'PB', nome: 'Paraíba', center: [-7.2, -36.7], zoom: 7, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '26', sigla: 'PE', nome: 'Pernambuco', center: [-8.4, -37.9], zoom: 6, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '27', sigla: 'AL', nome: 'Alagoas', center: [-9.6, -36.6], zoom: 7, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '28', sigla: 'SE', nome: 'Sergipe', center: [-10.6, -37.4], zoom: 7, regiao: 'Nordeste', hasResidueBreakdown: false },
  { code: '29', sigla: 'BA', nome: 'Bahia', center: [-12.5, -41.7], zoom: 5, regiao: 'Nordeste', hasResidueBreakdown: false },
  // Sudeste
  { code: '31', sigla: 'MG', nome: 'Minas Gerais', center: [-18.5, -44.5], zoom: 6, regiao: 'Sudeste', hasResidueBreakdown: false },
  { code: '32', sigla: 'ES', nome: 'Espírito Santo', center: [-19.6, -40.6], zoom: 7, regiao: 'Sudeste', hasResidueBreakdown: false },
  { code: '33', sigla: 'RJ', nome: 'Rio de Janeiro', center: [-22.2, -42.6], zoom: 7, regiao: 'Sudeste', hasResidueBreakdown: false },
  { code: '35', sigla: 'SP', nome: 'São Paulo', center: [-22.0, -48.5], zoom: 7, regiao: 'Sudeste', hasResidueBreakdown: true },
  // Sul
  { code: '41', sigla: 'PR', nome: 'Paraná', center: [-24.6, -51.6], zoom: 7, regiao: 'Sul', hasResidueBreakdown: false },
  { code: '42', sigla: 'SC', nome: 'Santa Catarina', center: [-27.2, -50.5], zoom: 7, regiao: 'Sul', hasResidueBreakdown: false },
  { code: '43', sigla: 'RS', nome: 'Rio Grande do Sul', center: [-29.8, -53.4], zoom: 6, regiao: 'Sul', hasResidueBreakdown: false },
  // Centro-Oeste
  { code: '50', sigla: 'MS', nome: 'Mato Grosso do Sul', center: [-20.5, -54.8], zoom: 6, regiao: 'Centro-Oeste', hasResidueBreakdown: false },
  { code: '51', sigla: 'MT', nome: 'Mato Grosso', center: [-13.0, -55.9], zoom: 5, regiao: 'Centro-Oeste', hasResidueBreakdown: false },
  { code: '52', sigla: 'GO', nome: 'Goiás', center: [-16.0, -49.6], zoom: 6, regiao: 'Centro-Oeste', hasResidueBreakdown: false },
  { code: '53', sigla: 'DF', nome: 'Distrito Federal', center: [-15.8, -47.8], zoom: 9, regiao: 'Centro-Oeste', hasResidueBreakdown: false },
];

const STATE_BY_CODE = new Map(BRAZIL_STATES.map((s) => [s.code, s]));

/** Look up a state by its 2-digit UF code. */
export function getState(code: string): BrazilState | undefined {
  return STATE_BY_CODE.get(code);
}

/** The UF code for a municipality, derived from its IBGE code (first 2 digits). */
export function ufOf(ibgeCode: string | number): string {
  return String(ibgeCode).slice(0, 2);
}

/** Center + zoom for a scope value (a UF code or SCOPE_BRAZIL). */
export function scopeView(scope: MapScope): { center: [number, number]; zoom: number } {
  if (scope === SCOPE_BRAZIL) return { center: BRAZIL_CENTER, zoom: BRAZIL_ZOOM };
  const state = STATE_BY_CODE.get(scope);
  return state
    ? { center: state.center, zoom: state.zoom }
    : { center: BRAZIL_CENTER, zoom: BRAZIL_ZOOM };
}

/** True when the given scope has the full per-residue biomass breakdown. */
export function scopeHasResidueBreakdown(scope: MapScope): boolean {
  if (scope === SCOPE_BRAZIL) return false;
  return STATE_BY_CODE.get(scope)?.hasResidueBreakdown ?? false;
}
