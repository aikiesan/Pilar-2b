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

export type ThematicPresetGroup = 'setorial' | 'residuo' | 'energia' | 'logistica';

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
};

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
];

export function getPresetById(id: string): ThematicPreset | undefined {
  return THEMATIC_PRESETS.find((p) => p.id === id);
}
