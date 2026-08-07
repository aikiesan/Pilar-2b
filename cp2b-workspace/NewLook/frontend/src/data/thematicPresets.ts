/**
 * Thematic map presets — one-click "mapas temáticos já prontos".
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

import type { VisualizationMode } from '@/components/map/LeftFilterPanel';
import type { BiomassType, ResidueType } from '@/components/map/FloatingControlPanel';
import type { DisplayMetric, ColorMode } from '@/types/geospatial';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import type { MapPaletteId } from '@/lib/mapMetrics';

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

export interface ThematicPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  group: ThematicPresetGroup;
  config: ThematicPresetConfig;
}

export const PRESET_GROUP_LABELS: Record<ThematicPresetGroup, string> = {
  setorial: 'Setoriais',
  residuo: 'Por resíduo',
  energia: 'Energia',
  logistica: 'Logística & Infraestrutura',
  analise: 'Análises avançadas',
};

// Ribbon category metadata: short label + icon for the top-bar dropdown chips.
// Order here is the order the categories appear in the ribbon.
export const PRESET_GROUP_META: { group: ThematicPresetGroup; label: string; icon: string }[] = [
  { group: 'setorial', label: 'Setoriais', icon: '⚡' },
  { group: 'residuo', label: 'Por resíduo', icon: '🌾' },
  { group: 'energia', label: 'Energia', icon: '🔥' },
  { group: 'logistica', label: 'Logística', icon: '🚛' },
  { group: 'analise', label: 'Análises', icon: '🧪' },
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
    label: 'Potencial Total',
    icon: '⚡',
    description: 'Biomassa total consolidada por município (todos os setores).',
    group: 'setorial',
    config: { ...BASE, biomassType: 'total', palette: 'ylgnbu' },
  },
  {
    id: 'agricola',
    label: 'Agrícola',
    icon: '🌾',
    description: 'Resíduos agrícolas — cana, soja, milho, café, citrus.',
    group: 'setorial',
    config: { ...BASE, biomassType: 'agricultural', palette: 'greens' },
  },
  {
    id: 'pecuaria',
    label: 'Pecuária',
    icon: '🐄',
    description: 'Dejetos de bovinos, suínos, aves e aquicultura.',
    group: 'setorial',
    config: { ...BASE, biomassType: 'livestock', palette: 'ylorrd' },
  },
  {
    id: 'urbano',
    label: 'Urbano',
    icon: '🏙️',
    description: 'Resíduos sólidos urbanos e poda (RSU + RPO).',
    group: 'setorial',
    config: { ...BASE, biomassType: 'urban', palette: 'bupu' },
  },

  // ── Por resíduo ─────────────────────────────────────────────────────────────
  {
    id: 'cana',
    label: 'Cana-de-açúcar',
    icon: '🌾',
    description: 'Palha e bagaço de cana — o maior fluxo do estado.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['sugarcane'], palette: 'greens' },
  },
  {
    id: 'soja',
    label: 'Soja',
    icon: '🌿',
    description: 'Palhada de soja por município.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['soybean'], palette: 'greens' },
  },
  {
    id: 'milho',
    label: 'Milho',
    icon: '🌽',
    description: 'Palhada e sabugo de milho.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['corn'], palette: 'greens' },
  },
  {
    id: 'cafe',
    label: 'Café',
    icon: '☕',
    description: 'Casca e polpa de café.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['coffee'], palette: 'ylorrd' },
  },
  {
    id: 'citrus',
    label: 'Citrus',
    icon: '🍊',
    description: 'Bagaço de citros (laranja).',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['citrus'], palette: 'ylorrd' },
  },
  {
    id: 'bovinos',
    label: 'Bovinos',
    icon: '🐄',
    description: 'Dejetos de bovinos por município.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['cattle'], palette: 'bupu' },
  },
  {
    id: 'suinos',
    label: 'Suínos',
    icon: '🐷',
    description: 'Dejetos de suínos — alto rendimento por cabeça.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['swine'], palette: 'bupu' },
  },
  {
    id: 'aves',
    label: 'Aves',
    icon: '🐔',
    description: 'Cama de frango e dejetos de aves.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['poultry'], palette: 'bupu' },
  },
  {
    id: 'rsu',
    label: 'RSU',
    icon: '🗑️',
    description: 'Fração orgânica dos resíduos sólidos urbanos.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['rsu'], palette: 'plasma' },
  },

  // ── Energia ─────────────────────────────────────────────────────────────────
  {
    id: 'biometano',
    label: 'Biometano',
    icon: '🔥',
    description: 'Potencial de biometano (Nm³/dia) no cenário Real.',
    group: 'energia',
    config: { ...BASE, displayMetric: 'biomethane_m3', palette: 'plasma' },
  },
  {
    id: 'bioenergia',
    label: 'Bioenergia',
    icon: '🔋',
    description: 'Energia potencial (MWh/ano) a partir do metano.',
    group: 'energia',
    config: { ...BASE, displayMetric: 'bioenergy_mwh', palette: 'ylorrd' },
  },

  // ── Logística & Infraestrutura ──────────────────────────────────────────────
  {
    id: 'escoamento',
    label: 'Escoamento & Gasodutos',
    icon: '🛢️',
    description:
      'Potencial total sobre a malha de gasodutos e usinas de biogás — onde há infraestrutura para escoar.',
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
    label: 'Aquicultura',
    icon: '🐟',
    description: 'Efluentes e lodo de piscicultura.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['aquaculture'], palette: 'bupu' },
  },
  {
    id: 'rpo',
    label: 'RPO (poda)',
    icon: '♻️',
    description: 'Resíduos de poda e capina urbana.',
    group: 'residuo',
    config: { ...BASE, selectedResidues: ['rpo'], palette: 'plasma' },
  },

  // ── Energia (complemento) ───────────────────────────────────────────────────
  {
    id: 'biogas',
    label: 'Biogás bruto',
    icon: '⚡',
    description: 'Biogás bruto (Nm³/dia) — metano + o CO₂ que vem junto.',
    group: 'energia',
    config: { ...BASE, displayMetric: 'biogas_m3', palette: 'plasma' },
  },

  // ── Logística & Infraestrutura (complementos) ───────────────────────────────
  {
    id: 'rede_eletrica',
    label: 'Rede elétrica (SIN)',
    icon: '🔌',
    description: 'Bioenergia sobre subestações e linhas de transmissão — onde injetar eletricidade.',
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
    label: 'Usinas existentes',
    icon: '🏭',
    description: 'Potencial teórico vs. plantas já instaladas (biogás, etanol, UTE a biomassa).',
    group: 'logistica',
    config: {
      ...BASE,
      palette: 'ylgnbu',
      layers: ['biogas_plant', 'ethanol_plant', 'biomass_thermal_plant'],
    },
  },
  {
    id: 'restricoes',
    label: 'Restrições ambientais',
    icon: '🛡️',
    description: 'Áreas protegidas, terras indígenas e assentamentos — onde não se licencia.',
    group: 'logistica',
    config: {
      ...BASE,
      palette: 'greens',
      layers: ['protected_area_state', 'indigenous_territory', 'settlement'],
    },
  },
  {
    id: 'rodovias',
    label: 'Rodovias & escoamento',
    icon: '🛣️',
    description: 'Malha rodoviária e gasodutos de escoamento sobre o potencial.',
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
    label: 'Tipologias (K4)',
    icon: '🧩',
    description: 'Agrupamento K-means dos municípios por perfil de biomassa (2023).',
    group: 'analise',
    config: { ...BASE, colorMode: 'cluster' },
  },
  {
    id: 'calor',
    label: 'Mapa de calor',
    icon: '🔥',
    description: 'Densidade do potencial como superfície de calor.',
    group: 'analise',
    config: { ...BASE, visualizationMode: 'heatmap' },
  },
  {
    id: 'bolhas',
    label: 'Bolhas proporcionais',
    icon: '⭕',
    description: 'Potencial por município como bolhas dimensionadas.',
    group: 'analise',
    config: { ...BASE, visualizationMode: 'bubble' },
  },
];

export function getPresetById(id: string): ThematicPreset | undefined {
  return THEMATIC_PRESETS.find((p) => p.id === id);
}
