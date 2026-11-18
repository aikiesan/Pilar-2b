/**
 * Thematic map presets — one-click, ready-made thematic maps.
 *
 * Each preset is a named bundle of the map's existing controls (visualization
 * mode, metric, sector, residue selection, scenario, colour palette, optional
 * layers). Applying one reconfigures the LIVE Leaflet map — it does not load a
 * pre-rendered image — so every theme stays interactive and reads the real data.
 * This is the interactive reading of "os filtros já são os próprios mapas
 * temáticos": the presets just save the reader from assembling the combination
 * by hand.
 *
 * Every preset also names a `palette`, so each theme carries its own colour
 * scale (agrícola → greens, urbano → blue-purple, energia → warm/plasma). The
 * palette stays user-switchable afterwards in the Temas tab; the preset only
 * sets the starting point.
 *
 * Scenario defaults to 'real' (the map's default, the defensible short-term
 * figure). Residue-specific and sector presets stay on it so their values match
 * the served scenario shares the choropleth paints.
 */

import type { VisualizationMode, BiomassType, ResidueType } from '@/types/map';
import type { DisplayMetric, ColorMode } from '@/types/geospatial';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import type { MapPaletteId } from '@/lib/mapMetrics';
import type { Messages } from '@/types/i18n';

export type ThematicPresetGroup = 'setorial' | 'residuo' | 'energia' | 'logistica' | 'analise';

export interface ThematicPresetConfig {
  visualizationMode?: VisualizationMode;
  displayMetric?: DisplayMetric;
  biomassType?: BiomassType;
  /** Empty array clears any residue filter; undefined leaves it untouched. */
  selectedResidues?: ResidueType[];
  colorMode?: ColorMode;
  scenario?: MapScenarioKey;
  palette?: MapPaletteId;
  /** Layer ids to switch ON when the preset is applied (additive). */
  layers?: string[];
}

/**
 * A preset's name and description are copy: Map.thematic.presets.<id>.label and
 * .description. Group names likewise: Map.thematic.groups (short),
 * .group_labels (ribbon) and .group_titles (side panel).
 */
export interface ThematicPreset {
  id: ThematicPresetId;
  icon: string;
  group: ThematicPresetGroup;
  config: ThematicPresetConfig;
}

export type ThematicPresetId = keyof Messages['Map']['thematic']['presets'];

// Ribbon category metadata: icon for the top-bar dropdown chips. Order here is
// the order the categories appear in the ribbon.
export const PRESET_GROUP_META: { group: ThematicPresetGroup; icon: string }[] = [
  { group: 'setorial', icon: '⚡' },
  { group: 'residuo', icon: '🌾' },
  { group: 'energia', icon: '🔥' },
  { group: 'logistica', icon: '🚛' },
  { group: 'analise', icon: '🧪' },
];

// Base config shared by most presets: choropleth, biogas colour mode, Real
// scenario. Spread first, then override per preset.
const BASE: ThematicPresetConfig = {
  visualizationMode: 'choropleth',
  colorMode: 'biogas',
  scenario: 'real',
  biomassType: 'total',
  selectedResidues: [],
  displayMetric: 'biomass_tons',
};

export const THEMATIC_PRESETS: ThematicPreset[] = [
  // ── Setoriais ─────────────────────────────────────────────────────────────
  {
    id: 'total',
    icon: '⚡',
    group: 'setorial',
    config: { ...BASE, biomassType: 'total', palette: 'ylgnbu' },
  },
  {
    id: 'agricola',
    icon: '🌾',
    group: 'setorial',
    config: { ...BASE, biomassType: 'agricultural', palette: 'greens' },
  },
  {
    id: 'pecuaria',
    icon: '🐄',
    group: 'setorial',
    config: { ...BASE, biomassType: 'livestock', palette: 'ylorrd' },
  },
  {
    id: 'urbano',
    icon: '🏙️',
    group: 'setorial',
    config: {
      ...BASE,
      biomassType: 'urban',
      selectedResidues: ['rsu', 'rpo', 'sewage'],
      displayMetric: 'methane_m3',
      palette: 'bupu',
    },
  },

  // ── Por resíduo ─────────────────────────────────────────────────────────────
  {
    id: 'cana',
    icon: '🌾',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['sugarcane'], palette: 'greens' },
  },
  {
    id: 'soja',
    icon: '🌿',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['soybean'], palette: 'greens' },
  },
  {
    id: 'milho',
    icon: '🌽',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['corn'], palette: 'greens' },
  },
  {
    id: 'cafe',
    icon: '☕',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['coffee'], palette: 'ylorrd' },
  },
  {
    id: 'citrus',
    icon: '🍊',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['citrus'], palette: 'ylorrd' },
  },
  {
    id: 'bovinos',
    icon: '🐄',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['cattle'], palette: 'bupu' },
  },
  {
    id: 'suinos',
    icon: '🐷',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['swine'], palette: 'bupu' },
  },
  {
    id: 'aves',
    icon: '🐔',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['poultry'], palette: 'bupu' },
  },
  {
    id: 'rsu',
    icon: '🗑️',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['rsu'], palette: 'plasma' },
  },

  // ── Energia ─────────────────────────────────────────────────────────────────
  {
    id: 'biometano',
    icon: '🔥',
    group: 'energia',
    config: { ...BASE, displayMetric: 'biomethane_m3', palette: 'plasma' },
  },
  {
    id: 'bioenergia',
    icon: '🔋',
    group: 'energia',
    config: { ...BASE, displayMetric: 'bioenergy_mwh', palette: 'ylorrd' },
  },

  // ── Logística & Infraestrutura ──────────────────────────────────────────────
  {
    id: 'escoamento',
    icon: '🛢️',
    group: 'logistica',
    config: {
      ...BASE,
      biomassType: 'total',
      displayMetric: 'biomethane_m3',
      palette: 'ylgnbu',
      layers: ['gas_pipeline_transport', 'gas_pipeline_distribution', 'biogas_plant'],
    },
  },

  // ── Por resíduo (complementos) ──────────────────────────────────────────────
  {
    id: 'aquicultura',
    icon: '🐟',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['aquaculture'], palette: 'bupu' },
  },
  {
    id: 'rpo',
    icon: '♻️',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['rpo'], palette: 'plasma' },
  },
  {
    id: 'sewage',
    icon: '💧',
    group: 'residuo',
    config: {
      ...BASE,
      biomassType: 'urban',
      selectedResidues: ['sewage'],
      displayMetric: 'methane_m3',
      palette: 'bupu',
    },
  },

  // ── Energia (complemento) ───────────────────────────────────────────────────
  {
    id: 'biogas',
    icon: '⚡',
    group: 'energia',
    config: { ...BASE, displayMetric: 'biogas_m3', palette: 'plasma' },
  },

  // ── Logística & Infraestrutura (complementos) ───────────────────────────────
  {
    id: 'rede_eletrica',
    icon: '🔌',
    group: 'logistica',
    config: {
      ...BASE,
      displayMetric: 'bioenergy_mwh',
      palette: 'ylorrd',
      layers: ['substation', 'transmission_line'],
    },
  },
  {
    id: 'usinas',
    icon: '🏭',
    group: 'logistica',
    config: {
      ...BASE,
      palette: 'ylgnbu',
      layers: ['biogas_plant', 'ethanol_plant', 'biomass_thermal_plant'],
    },
  },
  {
    id: 'restricoes',
    icon: '🛡️',
    group: 'logistica',
    config: {
      ...BASE,
      palette: 'greens',
      layers: ['protected_area_state', 'indigenous_territory', 'settlement'],
    },
  },
  {
    id: 'rodovias',
    icon: '🛣️',
    group: 'logistica',
    config: {
      ...BASE,
      palette: 'ylgnbu',
      layers: ['highway_state', 'highway_federal', 'gas_pipeline_outflow'],
    },
  },

  // ── Análises avançadas (modos analíticos já suportados) ─────────────────────
  // Nota: o "Perfil C:N" continua acessível pelo seletor de modo de cor na aba
  // Filtros; como mapa-destaque ele não entra, porque São Paulo é dominado por
  // resíduos ricos em carbono e o mapa fica quase todo numa faixa só (correto,
  // mas pouco informativo como "test drive").
  {
    id: 'clusters',
    icon: '🧩',
    group: 'analise',
    config: { ...BASE, colorMode: 'tipologia' },
  },
  {
    id: 'calor',
    icon: '🔥',
    group: 'analise',
    config: { ...BASE, visualizationMode: 'heatmap' },
  },
  {
    id: 'bolhas',
    icon: '⭕',
    group: 'analise',
    config: { ...BASE, visualizationMode: 'bubble' },
  },
  {
    id: 'per_capita',
    icon: '👥',
    group: 'analise',
    config: { ...BASE, displayMetric: 'ch4_per_capita', palette: 'bupu' },
  },
];
