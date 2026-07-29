/**
 * Residue registry + served biomass accessors.
 *
 * DATA-INTEGRITY CONTRACT: every tonnage this module returns is the value the
 * backend served for that municipality, keyed to that residue — nothing is
 * re-derived on the client. The previous version fell back to a client-side
 * "reverse-BMP" (tons = biogas / (BMP · VS)) whenever a biomass column was 0,
 * which invented tonnage the backend deliberately stopped emitting (migration
 * 025 sends biomass as `number | null` + a `*_coverage` flag). That fallback,
 * plus the duplicated BMP/VS constants it needed (a drift risk against the
 * canonical `data/canonical_parameters/feedstocks.yaml`), is gone. This module
 * and `lib/mapValues.ts` now read the *same* served fields, so the popup, the
 * profile panel, and the choropleth can never disagree.
 *
 * `mapValues.ts` remains the coverage-aware accessor (value + no_data/partial);
 * use it when the caller needs to distinguish "measured zero" from "no data".
 * These helpers return a plain number (null → 0) for the display surfaces that
 * only need a tonnage to format.
 */

import type { MunicipalityProperties } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/components/map/FloatingControlPanel';

type ResidueConfig = {
  label: string;
  sector: Exclude<BiomassType, 'total'>;
  /** The served GeoJSON property this residue's availability is read from. */
  biomassField: keyof MunicipalityProperties;
};

export const BIOMASS_RESIDUES: Record<ResidueType, ResidueConfig> = {
  sugarcane: { label: 'Cana', sector: 'agricultural', biomassField: 'sugarcane_biomass_tons_year' },
  soybean: { label: 'Soja', sector: 'agricultural', biomassField: 'soybean_biomass_tons_year' },
  corn: { label: 'Milho', sector: 'agricultural', biomassField: 'corn_biomass_tons_year' },
  coffee: { label: 'Café', sector: 'agricultural', biomassField: 'coffee_biomass_tons_year' },
  citrus: { label: 'Citrus', sector: 'agricultural', biomassField: 'citrus_biomass_tons_year' },
  cattle: { label: 'Bovinos', sector: 'livestock', biomassField: 'cattle_biomass_tons_year' },
  swine: { label: 'Suínos', sector: 'livestock', biomassField: 'swine_biomass_tons_year' },
  poultry: { label: 'Aves', sector: 'livestock', biomassField: 'poultry_biomass_tons_year' },
  aquaculture: { label: 'Aquicultura', sector: 'livestock', biomassField: 'aquaculture_biomass_tons_year' },
  rsu: { label: 'RSU', sector: 'urban', biomassField: 'rsu_biomass_tons_year' },
};

export const RESIDUES_BY_SECTOR: Record<Exclude<BiomassType, 'total'>, ResidueType[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu'],
};

export const numberValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Served availability (t/yr) for one residue. Null/absent → 0; never re-derived. */
export const getResidueBiomassTons = (
  props: MunicipalityProperties,
  residue: ResidueType
): number => {
  const config = BIOMASS_RESIDUES[residue];
  if (!config) return 0; // unknown residue type — no biomass contribution
  return numberValue(props[config.biomassField]);
};

/**
 * Served availability (t/yr) for one sector. Prefers the backend's sector total;
 * falls back to summing the sector's served residues only if that field is
 * absent from the payload (older responses). No invented tonnage either way.
 */
export const getSectorBiomassTons = (
  props: MunicipalityProperties,
  sector: Exclude<BiomassType, 'total'>
): number => {
  const sectorField = `${sector}_biomass_tons_year` as keyof MunicipalityProperties;
  if (props[sectorField] != null) return numberValue(props[sectorField]);

  return RESIDUES_BY_SECTOR[sector].reduce(
    (sum, residue) => sum + getResidueBiomassTons(props, residue),
    0
  );
};

/** Served total availability (t/yr). Prefers the backend total; else sums sectors. */
export const getTotalBiomassTons = (props: MunicipalityProperties): number => {
  if (props.total_biomass_tons_year != null) return numberValue(props.total_biomass_tons_year);

  return (
    getSectorBiomassTons(props, 'agricultural') +
    getSectorBiomassTons(props, 'livestock') +
    getSectorBiomassTons(props, 'urban')
  );
};

export const getBiomassTonsByType = (
  props: MunicipalityProperties,
  biomassType: BiomassType
): number => {
  if (biomassType === 'total') return getTotalBiomassTons(props);
  return getSectorBiomassTons(props, biomassType);
};
