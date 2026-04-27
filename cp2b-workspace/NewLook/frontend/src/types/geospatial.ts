/**
 * PILAR-2b V3 - Geospatial TypeScript Types
 * Type definitions for municipality data and GeoJSON structures
 */

// Municipality properties (matches backend data structure)
export interface MunicipalityProperties {
  id: string | number;
  name: string;
  ibge_code: string | number;
  area_km2: number;
  population: number;
  population_density: number;
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

  // Biomass availability (tons/year) — populated by load_biomass_tons.py
  total_biomass_tons_year: number;
  agricultural_biomass_tons_year: number;
  livestock_biomass_tons_year: number;
  urban_biomass_tons_year: number;
  sugarcane_biomass_tons_year: number;
  soybean_biomass_tons_year: number;
  corn_biomass_tons_year: number;
  coffee_biomass_tons_year: number;
  citrus_biomass_tons_year: number;
  cattle_biomass_tons_year: number;
  swine_biomass_tons_year: number;
  poultry_biomass_tons_year: number;
  aquaculture_biomass_tons_year: number;
  rsu_biomass_tons_year: number;
  rpo_biomass_tons_year: number;

  // Classification
  potential_category: 'ALTO' | 'MEDIO' | 'BAIXO' | 'SEM DADOS' | string;
}

// Display metric — controls whether map shows biogas potential or biomass availability
export type DisplayMetric = 'biogas_m3' | 'biomass_tons';

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
  combined_biomass_tons_year: number;
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
  total_biomass_tons_year: number;
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
