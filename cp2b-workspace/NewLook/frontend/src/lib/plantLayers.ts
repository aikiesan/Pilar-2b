/**
 * Plant-layer catalogue — the single source of truth for how each biomass plant
 * layer is drawn AND how it is explained.
 *
 * Marker styling used to live in InfrastructureLayer and the legend carried its
 * own hardcoded copy of the same four entries, so the two could disagree — and
 * did: the legend advertised Biometano/Etanol/UTE whenever the *biogás* layer
 * was switched on, and never mentioned Biodiesel at all. Both sides read this
 * table now, so a plant type that is drawn is necessarily a plant type that is
 * described, in the same colour.
 */

/** National plant layers (MapBiomas INFRAESTRUTURA), keyed by layer id. */
export type PlantLayerId =
  | 'biogas_plant'
  | 'ethanol_plant'
  | 'biomass_thermal_plant'
  | 'biodiesel_plant';

export interface PlantTypeInfo {
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  description: string;
  dataSource: string;
  year: string;
}

/**
 * Plant types by layer id.
 *
 * Colours are deliberately one per hue family — purple/green/orange/brown — so
 * that two plant types are never told apart by shade alone at map zoom.
 */
export const PLANT_LAYERS: Record<PlantLayerId, PlantTypeInfo> = {
  biogas_plant: {
    name: 'Biogás',
    icon: '🏭',
    color: '#27AE60',
    borderColor: '#1E5128',
    description: 'Plantas de produção de biogás',
    dataSource: 'MapBiomas — INFRAESTRUTURA',
    year: '2024',
  },
  ethanol_plant: {
    name: 'Etanol',
    icon: '🌽',
    color: '#9B59B6',
    borderColor: '#6C3483',
    description: 'Usinas de produção de etanol',
    dataSource: 'MapBiomas — INFRAESTRUTURA',
    year: '2024',
  },
  biomass_thermal_plant: {
    name: 'Biomassa UTE',
    icon: '⚡',
    color: '#E67E22',
    borderColor: '#BA4A00',
    description: 'Usinas termelétricas a biomassa',
    dataSource: 'MapBiomas — INFRAESTRUTURA',
    year: '2024',
  },
  // Biodiesel was drawn with the BIOMETANO marker (blue 💨), which put a plant
  // type on the map under another type's colour. Brown is free in the palette
  // above and reads as oil, which is what a biodiesel plant handles.
  biodiesel_plant: {
    name: 'Biodiesel',
    icon: '🛢️',
    color: '#8D6E63',
    borderColor: '#5D4037',
    description: 'Usinas de produção de biodiesel',
    dataSource: 'MapBiomas — INFRAESTRUTURA',
    year: '2024',
  },
};

export const PLANT_LAYER_IDS = Object.keys(PLANT_LAYERS) as PlantLayerId[];

export function isPlantLayer(id: string): id is PlantLayerId {
  return id in PLANT_LAYERS;
}

/**
 * Biometano has no national layer of its own: it only appears as a SUBTIPO of
 * the legacy São Paulo `biogas-plants` shapefile, which still differentiates its
 * markers by subtype. Kept out of PLANT_LAYERS so it cannot be toggled as a
 * layer, but exported so both the marker code and the legend can use it there.
 */
export const BIOMETHANE_PLANT: PlantTypeInfo = {
  name: 'Biometano',
  icon: '💨',
  color: '#3498DB',
  borderColor: '#1F618D',
  description: 'Plantas de produção de biometano',
  dataSource: 'MapBiomas + ANP',
  year: '2024',
};

/** Legacy SP layer: one legend covering every subtype it can draw. */
export const SP_PLANT_SUBTYPES: PlantTypeInfo[] = [
  PLANT_LAYERS.ethanol_plant,
  PLANT_LAYERS.biogas_plant,
  BIOMETHANE_PLANT,
  PLANT_LAYERS.biomass_thermal_plant,
];
