/**
 * Coverage-aware map value accessors.
 *
 * The choropleth must distinguish three states per municipality: a value we
 * measured, a value we modelled, and *no data at all*. The backend now sends
 * biomass as `number | null` plus a `*_coverage` flag exactly so the map can
 * tell "we looked and there is none" (0, measured) from "we never loaded this"
 * (null, no_data) — see backend migration 025.
 *
 * This deliberately does NOT reuse lib/biomassAvailability.ts: that helper
 * re-derives biomass client-side with reverse-BMP, which reintroduces the very
 * invented tonnage the backend now refuses to emit. Here we trust the served
 * values and their coverage, nothing more.
 */

import type {
  BiomassCoverage,
  DisplayMetric,
  MunicipalityProperties,
} from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/components/map/FloatingControlPanel';
import {
  isServedScenario,
  SERVED_SCENARIO_FIELD,
  SERVED_SCENARIO_RESIDUE_FIELD,
  CH4_FRACTION_OF_BIOGAS,
  type MapScenarioKey,
  type ServedScenarioKey,
} from '@/data/scenarioFactors';
import { getSectorBiomassTons } from './biomassAvailability';

export const NO_DATA: BiomassCoverage = 'no_data';

export type MapValue = { value: number | null; coverage: BiomassCoverage };

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const asRecord = (props: MunicipalityProperties): Record<string, unknown> =>
  props as unknown as Record<string, unknown>;

const covOf = (props: MunicipalityProperties, key: string): BiomassCoverage => {
  const c = asRecord(props)[`${key}_biomass_coverage`];
  return (c as BiomassCoverage) ?? NO_DATA;
};

const tonsOf = (props: MunicipalityProperties, key: string): number | null =>
  num(asRecord(props)[`${key}_biomass_tons_year`]);

/**
 * Coverage of a sum, from the coverage of its parts. Mirrors the backend's
 * _aggregate_coverage: a total built from some known and some unknown parts is
 * `partial` — a floor, not a total — and must never be painted as an ordinary
 * value, because outside São Paulo the missing (agricultural) part is ~77% of it.
 */
export function aggregateCoverage(covs: BiomassCoverage[]): BiomassCoverage {
  if (covs.length === 0 || covs.every((c) => c === NO_DATA)) return NO_DATA;
  if (covs.some((c) => c === NO_DATA)) return 'partial';
  const nonMeasured = covs.find((c) => c !== 'measured');
  return nonMeasured ?? 'measured';
}

/** Biomass availability (tons/year) for the selected sector or residue set. */
export function getBiomassMapValue(
  props: MunicipalityProperties,
  biomassType: BiomassType,
  selectedResidues: ResidueType[]
): MapValue {
  if (selectedResidues.length > 0) {
    const covs = selectedResidues.map((r) => covOf(props, r));
    const known = selectedResidues
      .map((r) => tonsOf(props, r))
      .filter((v): v is number => v !== null);
    return {
      value: known.length ? known.reduce((a, b) => a + b, 0) : null,
      coverage: aggregateCoverage(covs),
    };
  }
  return { value: tonsOf(props, biomassType), coverage: covOf(props, biomassType) };
}

/**
 * Canonical biogas potential (m³ CH4/year, municipality total) at one scenario.
 *
 * The backend propagates min/medio/max. The map's four named scenarios map onto
 * them: conservador→min, baseline→medio, otimista→max. 'fronteira' — the
 * "Fronteira do Biogás", the platform's headline optimistic-but-defensible band —
 * is the midpoint between medio and max, computed here from the served bands so
 * it works nationally rather than via the old SP-only factor scaling.
 */
/**
 * Pick one scenario off a served min/medio/max band. Shared by every canonical
 * per-scenario metric (biogas CH4, biomethane) so they map the four named map
 * scenarios onto the bands identically: conservador→min, baseline→medio,
 * otimista→max, fronteira→midpoint(medio,max).
 */
function pickScenario(
  scenario: MapScenarioKey,
  min: number | null,
  medio: number | null,
  max: number | null
): number | null {
  switch (scenario) {
    case 'conservador':
      return min;
    case 'otimista':
      return max;
    case 'fronteira':
      return max !== null && medio !== null ? medio + 0.5 * (max - medio) : medio;
    case 'baseline':
    default:
      return medio;
  }
}

/**
 * RAW BIOGAS (m³/year) — methane plus the CO2 it comes with.
 *
 * Distinct from methane: BMP is measured in NmL CH4/gVS, so the forward chain
 * yields CH4, and raw biogas is that divided by the feedstock's CH4 fraction
 * (52–72% across the corpus, median 57%) — roughly 1.8x larger.
 *
 * The map used to serve CH4 under a "Biogás" label. That made
 * biomethane/"biogás" read 0.97, which is the methane RECOVERY of an upgrading
 * unit, not the volumetric yield a reader expects from biogas. Against real raw
 * biogas the ratio is ~0.53, because upgrading strips the CO2.
 */
/**
 * CH₄ (m³/year) for a served scenario, or null when this municipality has none.
 *
 * Real and Ideal come whole from the backend rather than from the BMP band, so
 * they bypass pickScenario entirely. Only São Paulo's 645 rows carry them
 * (migration 026 loads SP only), so outside SP this returns null and the caller
 * paints NO_DATA — which is the honest reading, not a zero.
 *
 * With residues selected it sums their shares (migration 029) instead of reading
 * the municipality total, which is what makes the residue filter change the
 * choropleth rather than only the set of polygons drawn.
 */
function servedCh4(
  props: MunicipalityProperties,
  scenario: MapScenarioKey,
  selectedResidues: ResidueType[] = []
): number | null {
  if (!isServedScenario(scenario)) return null;
  const rec = asRecord(props);
  if (selectedResidues.length > 0) {
    // An ABSENT share is a zero, not "no data". The map payload omits falsy
    // values (municipalities.py), so a municipality that grows no cane simply
    // has no ch4_real_sugarcane_m3_year key. Only when nothing sums is there
    // nothing to paint — the same reading the missing total already gets.
    const sum = selectedResidues.reduce(
      (acc, r) => acc + (num(rec[SERVED_SCENARIO_RESIDUE_FIELD(scenario, r)]) ?? 0),
      0
    );
    return sum > 0 ? sum : null;
  }
  const v = num(rec[SERVED_SCENARIO_FIELD[scenario]]);
  return v !== null && v > 0 ? v : null;
}

/**
 * True when at least one of the selected residues is present here.
 *
 * The map's feature filter used to answer this from the legacy
 * `{residue}_biogas_m3_year` columns — which `fields=map` strips from the
 * payload (_DETAIL_ONLY_RE), so every municipality failed the test and picking a
 * residue emptied the map. It reads the served shares now, falling back to
 * per-residue tonnage for the band scenarios, which have no shares.
 */
export function hasAnySelectedResidue(
  props: MunicipalityProperties,
  selectedResidues: ResidueType[],
  scenario: MapScenarioKey
): boolean {
  if (selectedResidues.length === 0) return true;
  const rec = asRecord(props);
  return selectedResidues.some((r) => {
    if (isServedScenario(scenario)) {
      const share = num(rec[SERVED_SCENARIO_RESIDUE_FIELD(scenario, r)]);
      if (share !== null && share > 0) return true;
    }
    const tons = tonsOf(props, r);
    return tons !== null && tons > 0;
  });
}

export function getBiogasScenarioValue(
  props: MunicipalityProperties,
  scenario: MapScenarioKey,
  selectedResidues: ResidueType[] = []
): MapValue {
  if (isServedScenario(scenario)) {
    const ch4 = servedCh4(props, scenario, selectedResidues);
    return ch4 === null
      ? { value: null, coverage: NO_DATA }
      : { value: ch4 / CH4_FRACTION_OF_BIOGAS, coverage: 'measured' };
  }
  const medio = num(props.biogas_medio_m3_yr);
  if (medio === null) return { value: null, coverage: NO_DATA };
  const coverage = (props.total_biomass_coverage as BiomassCoverage) ?? 'estimated';
  return {
    value: pickScenario(scenario, num(props.biogas_min_m3_yr), medio, num(props.biogas_max_m3_yr)),
    coverage,
  };
}

/** Methane only (m³ CH4/year) — the quantity BMP actually predicts. */
export function getMethaneScenarioValue(
  props: MunicipalityProperties,
  scenario: MapScenarioKey,
  selectedResidues: ResidueType[] = []
): MapValue {
  if (isServedScenario(scenario)) {
    const ch4 = servedCh4(props, scenario, selectedResidues);
    return ch4 === null ? { value: null, coverage: NO_DATA } : { value: ch4, coverage: 'measured' };
  }
  const medio = num(props.biogas_ch4_medio_m3_yr);
  if (medio === null) return { value: null, coverage: NO_DATA };
  const coverage = (props.total_biomass_coverage as BiomassCoverage) ?? 'estimated';
  return {
    value: pickScenario(scenario, num(props.biogas_ch4_min_m3_yr), medio, num(props.biogas_ch4_max_m3_yr)),
    coverage,
  };
}

/**
 * Canonical biomethane potential (m³/year) at one scenario — the CH4 upgraded to
 * pipeline quality (backend map_metrics applies the 0.97 upgrading efficiency;
 * we read the served band, not re-derive it).
 */
export function getBiomethaneScenarioValue(
  props: MunicipalityProperties,
  scenario: MapScenarioKey,
  selectedResidues: ResidueType[] = []
): MapValue {
  // Under the FIESP convention the biomethane volume EQUALS the methane volume —
  // 0.625 is already the CH₄ fraction of biogas, so applying it again would
  // double-count. The backend serves these two identical for the same reason.
  if (isServedScenario(scenario)) {
    const ch4 = servedCh4(props, scenario, selectedResidues);
    return ch4 === null ? { value: null, coverage: NO_DATA } : { value: ch4, coverage: 'measured' };
  }
  const medio = num(props.biomethane_medio_m3_yr);
  if (medio === null) return { value: null, coverage: NO_DATA };
  const coverage = (props.total_biomass_coverage as BiomassCoverage) ?? 'estimated';
  return {
    value: pickScenario(scenario, num(props.biomethane_min_m3_yr), medio, num(props.biomethane_max_m3_yr)),
    coverage,
  };
}

/** 1 m³ CH4 ≈ 9.97 kWh = 0.00997 MWh (matches backend sync_db_canonical.py). */
export const MWH_PER_M3_CH4 = 0.00997;

/**
 * Bioenergy potential (MWh/year) from converting the biogas CH4 to electricity —
 * the "biogas → electricity" pathway. Derived from the served biogas CH4 band so
 * it is scenario- and coverage-aware for free. NOTE: this is NOT combustion of
 * dry residue (a separate pathway that needs calorific factors + PAM crop data).
 */
export function getBioenergyScenarioValue(
  props: MunicipalityProperties,
  scenario: MapScenarioKey,
  selectedResidues: ResidueType[] = []
): MapValue {
  // MWH_PER_M3_CH4 is the calorific value of pure METHANE, so it must be applied
  // to the CH4 band — never to raw biogas, which is ~45% CO2 and carries no
  // energy. Reading getBiogasScenarioValue here (as this did while that function
  // still returned CH4) would now silently inflate bioenergy by ~1.8x.
  const g = getMethaneScenarioValue(props, scenario, selectedResidues);
  return { value: g.value === null ? null : g.value * MWH_PER_M3_CH4, coverage: g.coverage };
}

/** Sector keys matching the panel's Agrícola / Pecuária / Urbano breakdown. */
export type BiomassSector = 'agricultural' | 'livestock' | 'urban';

/**
 * Sectors the served scenarios carry. Florestal exists only here: the band
 * scenarios are built from SECTOR_STREAMS, which has no forestry stream, while
 * Real/Ideal come from migration 026 and split four ways — the same four
 * /statistics/summary aggregates by, so the two levels can be compared.
 */
export type ServedSector = BiomassSector | 'forestry';
export const SERVED_SECTORS: ServedSector[] = [
  'agricultural',
  'livestock',
  'urban',
  'forestry',
];

/** Municipality property holding one sector's CH₄ for a served scenario. */
export const SERVED_SECTOR_FIELD = (tier: ServedScenarioKey, sector: ServedSector): string =>
  `ch4_${tier}_${sector}_m3_year`;

/**
 * One sector's CH₄ under a served scenario, or null when we have none.
 *
 * These columns are NOT in the map payload — eight more fields across 5,571
 * features for something only an opened municipality reads — so they arrive via
 * `/municipalities/{ibge}/metrics`, which the panel merges over the feature
 * properties. Before that endpoint served them they existed nowhere the client
 * could see, which is why the panel showed "Sem dados" under the default
 * scenario while the choropleth beside it painted a value.
 */
function servedSectorCh4(
  props: MunicipalityProperties,
  sector: ServedSector,
  scenario: MapScenarioKey
): number | null {
  if (!isServedScenario(scenario)) return null;
  return num(asRecord(props)[SERVED_SECTOR_FIELD(scenario, sector)]);
}

/**
 * One sector's value for a per-scenario metric, read from the served
 * `{sector}_biogas_ch4_{sc}_m3_yr` / `{sector}_biomethane_{sc}_m3_yr` bands
 * (map_metrics.SECTOR_STREAMS).
 *
 * Served, never derived. The sector split used to come from the legacy
 * `{sector}_biogas_m3_year` columns, which exist for 645 São Paulo
 * municipalities and nobody else, so outside SP the panel had nothing to break
 * down and biomethane/bioenergy had no split at all.
 */
/**
 * Which served band a sector metric reads. `biogas` is RAW biogas and `methane`
 * is CH₄ — they differ by the CH₄ fraction and must never be swapped. The stem
 * for `biogas` used to be `biogas_ch4`, so the sector bars were painting methane
 * under a "Biogás" label while the headline beside them showed raw biogas: the
 * same conflation #151 removed municipality-wide, still living per sector.
 */
const SECTOR_BAND_STEM = {
  biogas: 'biogas',
  methane: 'biogas_ch4',
  biomethane: 'biomethane',
} as const;

export function getSectorScenarioValue(
  props: MunicipalityProperties,
  sector: ServedSector,
  metric: keyof typeof SECTOR_BAND_STEM,
  scenario: MapScenarioKey
): number | null {
  // Real and Ideal keep their split in their own columns (migration 026), served
  // by the per-municipality detail endpoint. Convert from CH4 exactly the way
  // the municipality-wide accessors do, so a sector and the total beside it can
  // never disagree about what "biogás" means: raw biogas is CH4 over the CH4
  // fraction, biomethane equals CH4 under the FIESP convention.
  if (isServedScenario(scenario)) {
    const ch4 = servedSectorCh4(props, sector, scenario);
    if (ch4 === null) return null;
    return metric === 'biogas' ? ch4 / CH4_FRACTION_OF_BIOGAS : ch4;
  }
  // Florestal has no band-scenario stream, so it exists only above.
  if (sector === 'forestry') return null;
  const stem = SECTOR_BAND_STEM[metric];
  const medio = num(props[`${sector}_${stem}_medio_m3_yr` as keyof MunicipalityProperties]);
  if (medio === null) return null;
  return pickScenario(
    scenario,
    num(props[`${sector}_${stem}_min_m3_yr` as keyof MunicipalityProperties]),
    medio,
    num(props[`${sector}_${stem}_max_m3_yr` as keyof MunicipalityProperties])
  );
}

/**
 * One sector's value in whichever metric the map is currently showing, in that
 * metric's display unit — the single accessor the municipality panel needs so
 * its breakdown always matches the active toggle.
 *
 * Bioenergy is the biogas band × MWH_PER_M3_CH4, the same pure conversion
 * getBioenergyScenarioValue applies municipality-wide, so the two cannot drift.
 */
export function getSectorMetricValue(
  props: MunicipalityProperties,
  sector: ServedSector,
  metric: DisplayMetric,
  scenario: MapScenarioKey
): number | null {
  switch (metric) {
    case 'biogas_m3':
      return getSectorScenarioValue(props, sector, 'biogas', scenario);
    case 'methane_m3':
      // Was falling through to `default` — so picking "Metano" broke the sector
      // bars down in TONNES under a Nm³/dia unit.
      return getSectorScenarioValue(props, sector, 'methane', scenario);
    case 'biomethane_m3':
      return getSectorScenarioValue(props, sector, 'biomethane', scenario);
    case 'bioenergy_mwh': {
      // MWH_PER_M3_CH4 is the calorific value of pure METHANE, so it applies to
      // the CH4 band — never to raw biogas, which is ~45% CO2 and carries no
      // energy. Mirrors getBioenergyScenarioValue exactly.
      const g = getSectorScenarioValue(props, sector, 'methane', scenario);
      return g === null ? null : g * MWH_PER_M3_CH4;
    }
    case 'biomass_tons':
    default:
      // Florestal has no biomass column of its own.
      return sector === 'forestry' ? null : getSectorBiomassTons(props, sector);
  }
}

/**
 * One residue's served tonnage, or null when we have no data for it.
 *
 * `biomassAvailability.getResidueBiomassTons` coerces null to 0 for arithmetic,
 * which is right for summing but wrong for display: sugarcane outside São Paulo
 * has never been promoted, so its column is NULL, and rendering that as
 * "0 t/ano" states the municipality grows no cane. Detail rows must use this and
 * show "Sem dados" instead — the same distinction the choropleth already makes
 * with its no_data grey.
 */
export function getResidueTonsOrNull(
  props: MunicipalityProperties,
  residue: ResidueType
): number | null {
  if (covOf(props, residue) === NO_DATA) return null;
  return tonsOf(props, residue);
}
