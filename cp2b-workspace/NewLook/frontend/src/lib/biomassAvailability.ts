import type { MunicipalityProperties } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/components/map/FloatingControlPanel';

type ResidueAvailabilityConfig = {
  label: string;
  sector: Exclude<BiomassType, 'total'>;
  biomassField: keyof MunicipalityProperties;
  biogasField: keyof MunicipalityProperties;
  bmp: number;
  vsPercent: number;
};

export const BIOMASS_RESIDUES: Record<ResidueType, ResidueAvailabilityConfig> = {
  sugarcane: {
    label: 'Cana',
    sector: 'agricultural',
    biomassField: 'sugarcane_biomass_tons_year',
    biogasField: 'sugarcane_biogas_m3_year',
    bmp: 210,
    vsPercent: 77,
  },
  soybean: {
    label: 'Soja',
    sector: 'agricultural',
    biomassField: 'soybean_biomass_tons_year',
    biogasField: 'soybean_biogas_m3_year',
    bmp: 180,
    vsPercent: 84,
  },
  corn: {
    label: 'Milho',
    sector: 'agricultural',
    biomassField: 'corn_biomass_tons_year',
    biogasField: 'corn_biogas_m3_year',
    bmp: 280,
    vsPercent: 77,
  },
  coffee: {
    label: 'Café',
    sector: 'agricultural',
    biomassField: 'coffee_biomass_tons_year',
    biogasField: 'coffee_biogas_m3_year',
    bmp: 350,
    vsPercent: 89,
  },
  citrus: {
    label: 'Citrus',
    sector: 'agricultural',
    biomassField: 'citrus_biomass_tons_year',
    biogasField: 'citrus_biogas_m3_year',
    bmp: 300,
    vsPercent: 20,
  },
  cattle: {
    label: 'Bovinos',
    sector: 'livestock',
    biomassField: 'cattle_biomass_tons_year',
    biogasField: 'cattle_biogas_m3_year',
    bmp: 210,
    vsPercent: 12.5,
  },
  swine: {
    label: 'Suínos',
    sector: 'livestock',
    biomassField: 'swine_biomass_tons_year',
    biogasField: 'swine_biogas_m3_year',
    bmp: 210,
    vsPercent: 3.5,
  },
  poultry: {
    label: 'Aves',
    sector: 'livestock',
    biomassField: 'poultry_biomass_tons_year',
    biogasField: 'poultry_biogas_m3_year',
    bmp: 270,
    vsPercent: 50,
  },
  aquaculture: {
    label: 'Aquicultura',
    sector: 'livestock',
    biomassField: 'aquaculture_biomass_tons_year',
    biogasField: 'aquaculture_biogas_m3_year',
    bmp: 200,
    vsPercent: 15,
  },
  rsu: {
    label: 'RSU',
    sector: 'urban',
    biomassField: 'rsu_biomass_tons_year',
    biogasField: 'rsu_biogas_m3_year',
    bmp: 410,
    vsPercent: 17,
  },
  rpo: {
    label: 'RPO',
    sector: 'urban',
    biomassField: 'rpo_biomass_tons_year',
    biogasField: 'rpo_biogas_m3_year',
    bmp: 210,
    vsPercent: 3.1,
  },
};

export const RESIDUES_BY_SECTOR: Record<Exclude<BiomassType, 'total'>, ResidueType[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo'],
};

export const numberValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const reverseBmpTons = (biogasM3: number, bmp: number, vsPercent: number): number => {
  const denominator = bmp * (vsPercent / 100);
  return denominator > 0 && biogasM3 > 0 ? biogasM3 / denominator : 0;
};

export const getResidueBiomassTons = (
  props: MunicipalityProperties,
  residue: ResidueType
): number => {
  const config = BIOMASS_RESIDUES[residue];
  if (!config) return 0; // unknown residue type — no biomass contribution
  const storedBiomass = numberValue(props[config.biomassField]);
  if (storedBiomass > 0) return storedBiomass;

  return reverseBmpTons(
    numberValue(props[config.biogasField]),
    config.bmp,
    config.vsPercent
  );
};

export const getSectorBiomassTons = (
  props: MunicipalityProperties,
  sector: Exclude<BiomassType, 'total'>
): number => {
  const sectorField = `${sector}_biomass_tons_year` as keyof MunicipalityProperties;
  const storedBiomass = numberValue(props[sectorField]);
  if (storedBiomass > 0) return storedBiomass;

  return RESIDUES_BY_SECTOR[sector].reduce(
    (sum, residue) => sum + getResidueBiomassTons(props, residue),
    0
  );
};

export const getTotalBiomassTons = (props: MunicipalityProperties): number => {
  const storedBiomass = numberValue(props.total_biomass_tons_year);
  if (storedBiomass > 0) return storedBiomass;

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
