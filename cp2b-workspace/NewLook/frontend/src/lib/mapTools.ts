/**
 * The map's click tools: which exist, which the Tools menu offers, and how each
 * keeps itself in the URL.
 *
 * One tool is open at a time, named by ?tool=. Each tool has its own params,
 * and switching or closing a tool clears every tool param, never the map's own
 * (?m= profile, ?a= analysis, ?scope= state, filters). That is why Compare and
 * Find similar do not use the names a brief first gave them: `a` and `scope`
 * already belong to the map.
 *
 *   land     ?tool=land&lat&lng&radius
 *   compare  ?tool=compare&pair=<ibge>,<ibge>
 *   gather   ?tool=gather&lat&lng&radius  or  ?tool=gather&hub=<ibge>
 *   similar  ?tool=similar&of=<ibge>&within=state|both
 *
 * Who may USE a tool is a separate question: useMapToolAccess().
 */

import {
  DEFAULT_LAND_AROUND_RADIUS,
  isLandAroundRadius,
  type LandAroundPoint,
  type LandAroundRadius,
} from '@/lib/landAround';

export type MapToolId = 'land' | 'compare' | 'gather' | 'similar';

export const MAP_TOOL_IDS: readonly MapToolId[] = ['land', 'compare', 'gather', 'similar'];

/**
 * Tools that are built. A tool joins this list in the step that builds it;
 * until then it is left out of the menu and its links open the plain map.
 */
export const BUILT_MAP_TOOLS: readonly MapToolId[] = ['land', 'compare'];

/**
 * Tools that open with the analyses held back (MAP_ANALYSES_ENABLED off).
 * Land around replaced a public page, so it stays; the new tools wait.
 */
const TOOLS_WITHOUT_ANALYSES: readonly MapToolId[] = ['land'];

export function isMapToolId(value: unknown): value is MapToolId {
  return typeof value === 'string' && (MAP_TOOL_IDS as readonly string[]).includes(value);
}

/** The tools the Tools menu offers, in menu order. */
export function availableMapTools(analysesEnabled: boolean): MapToolId[] {
  return MAP_TOOL_IDS.filter(
    (id) => BUILT_MAP_TOOLS.includes(id) && (analysesEnabled || TOOLS_WITHOUT_ANALYSES.includes(id)),
  );
}

export function isMapToolAvailable(id: MapToolId | null, analysesEnabled: boolean): id is MapToolId {
  return id !== null && availableMapTools(analysesEnabled).includes(id);
}

export type SimilarWithin = 'state' | 'both';

export interface MapToolUrlState {
  tool: MapToolId | null;
  land: { point: LandAroundPoint | null; radius: LandAroundRadius };
  compare: { pair: string[] };
  gather: { point: LandAroundPoint | null; radius: LandAroundRadius; hub: string | null };
  similar: { of: string | null; within: SimilarWithin };
}

/** Every param a tool may write; cleared together on each write. */
const TOOL_PARAMS = ['tool', 'lat', 'lng', 'radius', 'pair', 'hub', 'of', 'within'] as const;

const IBGE = /^\d{7}$/;

function readPoint(params: URLSearchParams): LandAroundPoint | null {
  const latRaw = params.get('lat');
  const lngRaw = params.get('lng');
  const lat = latRaw === null || latRaw.trim() === '' ? NaN : Number(latRaw);
  const lng = lngRaw === null || lngRaw.trim() === '' ? NaN : Number(lngRaw);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return valid ? { lat, lng } : null;
}

function readRadius(params: URLSearchParams): LandAroundRadius {
  const raw = Number(params.get('radius'));
  return isLandAroundRadius(raw) ? raw : DEFAULT_LAND_AROUND_RADIUS;
}

function readIbge(value: string | null): string | null {
  return value !== null && IBGE.test(value) ? value : null;
}

/** The empty state: no tool open, every tool at its defaults. */
export function emptyMapToolState(): MapToolUrlState {
  return {
    tool: null,
    land: { point: null, radius: DEFAULT_LAND_AROUND_RADIUS },
    compare: { pair: [] },
    gather: { point: null, radius: DEFAULT_LAND_AROUND_RADIUS, hub: null },
    similar: { of: null, within: 'state' },
  };
}

/**
 * Reads the open tool and its params from a query string. Only the open tool's
 * params are read; anything malformed falls back quietly to the default.
 */
export function parseMapToolParams(search: string | URLSearchParams): MapToolUrlState {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const state = emptyMapToolState();
  const raw = params.get('tool');
  if (!isMapToolId(raw)) return state;
  state.tool = raw;
  switch (raw) {
    case 'land':
      state.land = { point: readPoint(params), radius: readRadius(params) };
      break;
    case 'compare': {
      const codes = (params.get('pair') ?? '').split(',').map((c) => readIbge(c.trim()));
      state.compare = { pair: Array.from(new Set(codes.filter((c): c is string => c !== null))).slice(0, 2) };
      break;
    }
    case 'gather':
      state.gather = { point: readPoint(params), radius: readRadius(params), hub: readIbge(params.get('hub')) };
      break;
    case 'similar':
      state.similar = { of: readIbge(params.get('of')), within: params.get('within') === 'both' ? 'both' : 'state' };
      break;
  }
  return state;
}

/**
 * The map's query string as it stands, for links that come back to it (after
 * sign-in): they keep the scope, scenario, mode and filters. Empty on the server.
 */
export function currentMapSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/**
 * Writes the open tool's params into a copy of the query string, leaving every
 * other param as it was. No tool removes all of them.
 */
export function writeMapToolParams(
  search: string | URLSearchParams,
  state: Pick<MapToolUrlState, 'tool'> & Partial<Omit<MapToolUrlState, 'tool'>>,
): URLSearchParams {
  const params = new URLSearchParams(search);
  for (const key of TOOL_PARAMS) params.delete(key);
  if (!state.tool) return params;
  params.set('tool', state.tool);
  const point = (p: LandAroundPoint | null | undefined) => {
    if (!p) return;
    params.set('lat', p.lat.toFixed(4));
    params.set('lng', p.lng.toFixed(4));
  };
  switch (state.tool) {
    case 'land':
      point(state.land?.point);
      params.set('radius', String(state.land?.radius ?? DEFAULT_LAND_AROUND_RADIUS));
      break;
    case 'compare':
      if (state.compare?.pair.length) params.set('pair', state.compare.pair.join(','));
      break;
    case 'gather':
      if (state.gather?.hub) params.set('hub', state.gather.hub);
      else {
        point(state.gather?.point);
        params.set('radius', String(state.gather?.radius ?? DEFAULT_LAND_AROUND_RADIUS));
      }
      break;
    case 'similar':
      if (state.similar?.of) params.set('of', state.similar.of);
      if (state.similar?.within === 'both') params.set('within', 'both');
      break;
  }
  return params;
}
