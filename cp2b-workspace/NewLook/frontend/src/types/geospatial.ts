/**
 * PILAR-2b V3 - Geospatial TypeScript Types
 * Type definitions for municipality data and GeoJSON structures
 */

// Municipality properties (matches backend data structure)
// Provenance of a biomass number on the map. Absence of data is a first-class
// state, not a zero — see backend migration 025 / municipality_biomass_provenance.
export type BiomassCoverage = 'measured' | 'estimated' | 'partial' | 'no_data';

export interface MunicipalityProperties {
  id: string | number;
  name: string;
  ibge_code: string | number;
  area_km2: number;
  population: number;
  population_density: number;
  population_year?: number;
  area_year?: number;
  gdp_total?: number;
  gdp_per_capita?: number;
  gdp_year?: number;
  immediate_region: string;
  intermediate_region: string;
  immediate_region_code: string;
  intermediate_region_code: string;

  // Biogas potential (m³/year)
  total_biogas_m3_year: number;
  agricultural_biogas_m3_year: number;
  livestock_biogas_m3_year: number;
  urban_biogas_m3_year: number;

  // Sector breakdown
  sugarcane_biogas_m3_year: number;
  soybean_biogas_m3_year: number;
  corn_biogas_m3_year: number;
  coffee_biogas_m3_year: number;
  citrus_biogas_m3_year: number;
  cattle_biogas_m3_year: number;
  swine_biogas_m3_year: number;
  poultry_biogas_m3_year: number;
  aquaculture_biogas_m3_year: number;
  forestry_biogas_m3_year: number;
  rsu_biogas_m3_year: number;
  rpo_biogas_m3_year: number;

  // Residues (legacy alias kept for compatibility)
  sugarcane_residues_tons_year: number;
  soybean_residues_tons_year: number;
  corn_residues_tons_year: number;

  // Biomass availability (tons/year). NULL means "no data" (never loaded) — the
  // API deliberately does not coerce it to 0, because a real 0 and a data gap are
  // different things on the map. Pair each with its *_biomass_coverage below.
  total_biomass_tons_year: number | null;
  agricultural_biomass_tons_year: number | null;
  livestock_biomass_tons_year: number | null;
  urban_biomass_tons_year: number | null;
  sugarcane_biomass_tons_year: number | null;
  soybean_biomass_tons_year: number | null;
  corn_biomass_tons_year: number | null;
  coffee_biomass_tons_year: number | null;
  citrus_biomass_tons_year: number | null;
  cattle_biomass_tons_year: number | null;
  swine_biomass_tons_year: number | null;
  poultry_biomass_tons_year: number | null;
  aquaculture_biomass_tons_year: number | null;
  rsu_biomass_tons_year: number | null;
  rpo_biomass_tons_year: number | null;

  // Coverage per stream/sector: 'measured' | 'estimated' | 'partial' | 'no_data'
  // (migration 025). Accessed dynamically as `${stream}_biomass_coverage`, so an
  // index signature carries them rather than 15 explicit entries.
  total_biomass_coverage?: BiomassCoverage;
  agricultural_biomass_coverage?: BiomassCoverage;
  livestock_biomass_coverage?: BiomassCoverage;
  urban_biomass_coverage?: BiomassCoverage;

  // Canonical potential per scenario (municipality totals). NULL when no canonical
  // metric could be computed. Min/medio/max are the propagated uncertainty bands;
  // the map's 'fronteira' is derived from them.
  //
  // THREE DISTINCT QUANTITIES — do not substitute one for another:
  //   biogas_*      raw biogas, m³/year (CH4 + CO2)
  //   biogas_ch4_*  methane only, m³ CH4/year — what BMP predicts
  //   biomethane_*  upgraded methane, m³/year (CH4 × 0.97 recovery)
  // biomethane/biogas_ch4 ≈ 0.97 (methane recovery); biomethane/biogas ≈ 0.53
  // (volumetric yield, since upgrading strips the CO2).
  biogas_min_m3_yr?: number | null;
  /** Cenário Real / Cenário Ideal — CH₄ Nm³/ano served whole (migration 026).
   *  São Paulo only; absent elsewhere, which the map paints as no-data. */
  ch4_real_m3_year?: number | null;
  ch4_ideal_m3_year?: number | null;
  biogas_medio_m3_yr?: number | null;
  biogas_max_m3_yr?: number | null;
  biogas_ch4_min_m3_yr?: number | null;
  biogas_ch4_medio_m3_yr?: number | null;
  biogas_ch4_max_m3_yr?: number | null;
  biomethane_min_m3_yr?: number | null;
  biomethane_medio_m3_yr?: number | null;
  biomethane_max_m3_yr?: number | null;
  biomass_gross_total_tons_yr?: number | null;
  biomass_corrected_min_tons_yr?: number | null;
  biomass_corrected_medio_tons_yr?: number | null;
  biomass_corrected_max_tons_yr?: number | null;

  // Classification
  potential_category: 'ALTO' | 'MEDIO' | 'BAIXO' | 'SEM DADOS' | string;

  // Per-stream coverage flags (cattle_biomass_coverage, sugarcane_biomass_coverage, …).
  [key: `${string}_biomass_coverage`]: BiomassCoverage | undefined;

  // K-means cluster fields (from municipality_summary, null when no match)
  cluster_id?: number | null;
  cluster_label?: string | null;
  mun_total_GWh?: number | null;
  mun_n_streams?: number | null;
  mun_dominant_stream?: string | null;
}

// Display metric — controls whether map shows biogas potential or biomass availability
export type DisplayMetric =
  | 'biomass_tons'
  | 'biogas_m3'
  | 'methane_m3'
  | 'biomethane_m3'
  | 'bioenergy_mwh';

// Color mode — controls the choropleth styling (biogas/biomass, C/N profile, or clusters)
export type ColorMode = 'biogas' | 'cn_profile' | 'cluster';

// ─── Co-digestion cluster types ───────────────────────────────────────────────

export interface CodigestionResidue {
  key: string;
  label: string;
  sector: 'agricultural' | 'livestock' | 'urban';
  cn_ratio: number;
  cn_role: 'carbon_donor' | 'nitrogen_donor' | 'balanced';
  biomass_tons_year: number;
}

export interface CodigestionPair {
  residue_a: CodigestionResidue;
  residue_b: CodigestionResidue;
  cn_combined: number;
  cn_combined_in_range: boolean;
  improvement_score: number;
  combined_biomass_tons_year?: number;
  combined_biogas_m3_year?: number;
  blend_ratio_A_to_B: string;
}

export interface CodigestionClusterMunicipality {
  ibge_code: string;
  name: string;
  distance_from_centroid_km: number;
}

export interface CodigestionCluster {
  cluster_id: string;
  municipality_count: number;
  municipalities: CodigestionClusterMunicipality[];
  convex_hull: {
    type: string;
    coordinates: number[][][];
  } | null;
  centroid: { lat: number; lng: number };
  top_pair: CodigestionPair;
  all_qualifying_pairs: CodigestionPair[];
  all_present_residues: string[];
  cluster_score: number;
  total_biomass_tons_year?: number;
  total_biogas_m3_year?: number;
}

export interface CodigestionClustersResponse {
  clusters: CodigestionCluster[];
  total_clusters: number;
  parameters: {
    radius_km: number;
    min_biomass_tons: number;
  };
}

export interface ResidueCNEntry {
  key: string;
  label: string;
  sector: string;
  cn_ratio: number;
  in_optimal_range: boolean;
  cn_role: 'carbon_donor' | 'nitrogen_donor' | 'balanced';
}

export interface ResidueCNMatrix {
  residues: ResidueCNEntry[];
  optimal_range: { low: number; high: number };
}

export interface MunicipalityCnProfile {
  ibge_code: string;
  municipality_name: string;
  centroid_lat: number;
  centroid_lng: number;
  cn_ratio_weighted: number;
  cn_label: 'C-RICH' | 'BALANCED' | 'N-RICH';
  dominant_residue: string | null;
  total_biogas_m3_year: number;
  residue_breakdown: Record<string, { biogas_m3: number; cn: number }>;
}

export interface MunicipalityCnProfilesResponse {
  profiles: MunicipalityCnProfile[];
  count: number;
}

export interface PairingCandidate {
  ibge_code: string;
  municipality_name: string;
  distance_km: number;
  cn_ratio_weighted: number;
  cn_label: 'C-RICH' | 'BALANCED' | 'N-RICH';
  dominant_residue: string | null;
  total_biogas_m3_year: number;
  cn_blended: number;
  improvement_score: number;
}

export interface PairingCandidatesResponse {
  ibge_code: string;
  radius_km: number;
  candidates: PairingCandidate[];
}

// GeoJSON Feature for municipality
export interface MunicipalityFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'MultiPolygon';
    coordinates: number[] | number[][][];
  };
  properties: MunicipalityProperties;
}

// GeoJSON FeatureCollection
export interface MunicipalityCollection {
  type: 'FeatureCollection';
  features: MunicipalityFeature[];
  metadata?: {
    total_municipalities: number;
    region?: string;
    source?: string;
    note?: string;
  };
}

// Summary statistics from API
export interface SummaryStatistics {
  /**
   * Geographic scope these totals describe. The endpoint is São Paulo-scoped:
   * the legacy biogas columns it sums are populated only for the 645 SP
   * municipalities, so a national total would be a fiction. Non-SP rows are on
   * the map as a beta layer and are excluded here — see lib/mapScope.
   */
  scope?: 'SP';
  scope_label?: string;
  total_municipalities: number;
  total_biogas_m3_year: number;
  average_biogas_m3_year: number;
  total_population: number;
  top_municipality: {
    name: string;
    biogas_m3_year: number;
  };
  top_5_municipalities: Array<{
    name: string;
    biogas_m3_year: number;
  }>;
  categories: Record<string, number>;
  sector_breakdown: {
    agricultural: number;
    livestock: number;
    urban: number;
  };
  sector_percentages: {
    agricultural: number;
    livestock: number;
    urban: number;
  };
  note?: string;
}

// Municipality list item (simplified)
export interface MunicipalityListItem {
  id: string | number;
  name: string;
  ibge_code: string | number;
  population: number;
  total_biogas_m3_year: number;
  potential_category: string;
  immediate_region: string;
}

// Rankings response
export interface RankingsResponse {
  criteria: 'total' | 'agricultural' | 'livestock' | 'urban';
  total_ranked: number;
  rankings: Array<{
    rank: number;
    id: string | number;
    name: string;
    ibge_code: string | number;
    biogas_m3_year: number;
    population: number;
    category: string;
  }>;
}

// Map styles
export interface MapStyle {
  fillColor: string;
  weight: number;
  opacity: number;
  color: string;
  fillOpacity: number;
}

// Color scale thresholds
export interface ColorScale {
  veryHigh: number;
  high: number;
  medium: number;
  low: number;
  veryLow: number;
}

// Legend item
export interface LegendItem {
  color: string;
  label: string;
  minValue: number;
  maxValue?: number;
}
