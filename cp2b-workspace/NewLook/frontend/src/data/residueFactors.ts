/**
 * Residue-level FDE factors for the advanced analysis.
 *
 * Source: backend/data/FDE_Disponibilidade_Residuos_CP2B.xlsx (sheet
 * Fatores_Totais), which also holds each residue's classification, SP potential
 * and validation sources (sheets Ref_Docs, Ref_Sugarcane). Kept here is what the
 * analysis computes with or displays: each residue's name, its FC, FCp, FS and
 * FL with their justifications, and its BMP. FDE is always computed from the
 * four factors (calculateFDE), never stored.
 */

import type { Localized } from '@/lib/localized'

export type FactorKey = 'fc' | 'fcp' | 'fs' | 'fl'

// Justifications the sheet gives for many residues.
const CONTINUOUS_GENERATION: Localized = { 'pt-BR': 'Geração contínua; 95% do ano', en: 'Continuous generation; 95% of the year' }
const SUGARCANE_HARVEST: Localized = { 'pt-BR': 'Safra cana: Abril-Novembro', en: 'Sugarcane harvest: April–November' }
const CITRUS_HARVEST: Localized = { 'pt-BR': 'Safra citros: Abril-Dezembro; 90%', en: 'Citrus harvest: April–December; 90%' }
const CITRUS_BELT: Localized = { 'pt-BR': 'Cinturão citros; 30-40km', en: 'Citrus belt; 30–40 km' }
const COFFEE_HARVEST: Localized = { 'pt-BR': 'Safra café: Junho-Setembro; 85%', en: 'Coffee harvest: June–September; 85%' }

export interface DetailedResidue {
  code: string
  /** Display name, in both languages. */
  name: Localized
  /** Sector, as the analysis groups residues. */
  category: 'urban' | 'livestock' | 'agricultural' | 'industrial'

  // FDE Correction Factors
  fc: number      // Collection Factor
  fcp: number     // Competition Factor
  fs: number      // Seasonal Factor
  fl: number      // Logistics Factor

  // Technical Data
  bmp: number     // Biochemical Methane Potential (m³/kg SV)
  // Residue-to-Product Ratio: fraction of this sub-residue relative to parent crop mass.
  // Used to apportion a shared DB stream (e.g. "sugarcane") among multiple frontend codes.
  // Omit (or set 1.0) for residues with a 1-to-1 stream mapping.
  rpr?: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  /** Why each factor has its value (shown beside its slider). */
  justification: Record<FactorKey, Localized>
}

export const DETAILED_RESIDUES: DetailedResidue[] = [
  // Urban
  {
    code: 'URB_LODO_PRIMARIO',
    name: { 'pt-BR': 'Lodo Primário (ETEs)', en: 'Primary sludge (WWTPs)' },
    category: 'urban',
    fc: 0.85,
    fcp: 0.25,
    fs: 0.95,
    fl: 0.9,
    bmp: 0.25,
    rpr: 0.40,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': 'ETEs centralizam; 85% coletável peneiramento', en: 'Centralized at WWTPs; 85% recoverable by screening' },
      fcp: { 'pt-BR': 'CETESB/SABESP: 25% compostagem/agricultura → 75% disponível', en: 'CETESB/SABESP: 25% goes to composting/agriculture → 75% available' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Centralizado ETEs; 15-20km; viável', en: 'Centralized at WWTPs; 15–20 km; viable' },
    },
  },
  {
    code: 'URB_LODO_SECUNDARIO',
    name: { 'pt-BR': 'Lodo Secundário (ETEs)', en: 'Secondary sludge (WWTPs)' },
    category: 'urban',
    fc: 0.82,
    fcp: 0.3,
    fs: 0.95,
    fl: 0.85,
    bmp: 0.28,
    rpr: 0.40,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': 'Sistemas secundários; 82% coletável', en: 'Secondary treatment systems; 82% collectable' },
      fcp: { 'pt-BR': 'CETESB: 30% fertilização → 70% disponível', en: 'CETESB: 30% used as fertilizer → 70% available' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Centralizado ETEs; 15-25km; viável', en: 'Centralized at WWTPs; 15–25 km; viable' },
    },
  },
  {
    code: 'URB_FORSU_SEPARADA',
    name: { 'pt-BR': 'FORSU - Fração Orgânica Separada', en: 'OFMSW — source-separated organic fraction' },
    category: 'urban',
    fc: 0.9,
    fcp: 0.35,
    fs: 0.9,
    fl: 0.8,
    bmp: 0.35,
    rpr: 0.20,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': 'Separação na fonte; 90% de pureza', en: 'Source separation; 90% purity' },
      fcp: { 'pt-BR': 'ABRELPE: 35% uso animal/compostagem → 65% disponível', en: 'ABRELPE: 35% goes to animal feed/composting → 65% available' },
      fs: { 'pt-BR': 'Coleta seletiva; variação sazonal ~10%', en: 'Separate collection; ~10% seasonal variation' },
      fl: { 'pt-BR': 'Distribuído pontos coleta; 25km; razoável', en: 'Spread across collection points; 25 km; reasonable' },
    },
  },
  
  // Livestock
  {
    code: 'PEC_DEJETOS_LIQUIDOS_SUINO',
    name: { 'pt-BR': 'Dejetos Líquidos Suínos', en: 'Liquid swine manure' },
    category: 'livestock',
    fc: 0.9,
    fcp: 0.45,
    fs: 0.95,
    fl: 0.75,
    bmp: 0.32,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': 'Sistemas confinados; 90% coletável', en: 'Confined systems; 90% collectable' },
      fcp: { 'pt-BR': 'EMBRAPA: 45% fertirrigação direta → 55% disponível', en: 'EMBRAPA: 45% direct fertigation → 55% available' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Concentrado regiões; viável transporte', en: 'Regionally concentrated; transport viable' },
    },
  },
  {
    code: 'PEC_ESTERCO_BOVINO',
    name: { 'pt-BR': 'Esterco Bovino', en: 'Cattle manure' },
    category: 'livestock',
    fc: 0.8,
    fcp: 0.55,
    fs: 0.85,
    fl: 0.7,
    bmp: 0.18,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': 'Confinamento; 80% coletável', en: 'Confinement systems; 80% collectable' },
      fcp: { 'pt-BR': 'EMBRAPA: 55% fertilização → 45% disponível', en: 'EMBRAPA: 55% used as fertilizer → 45% available' },
      fs: { 'pt-BR': 'Sazonalidade moderada ~15%', en: 'Moderate seasonality (~15%)' },
      fl: { 'pt-BR': 'Dispersão regional; transporte moderado', en: 'Regionally dispersed; moderate transport' },
    },
  },
  {
    code: 'PEC_CAMA_AVIARIO',
    name: { 'pt-BR': 'Cama de Aviário', en: 'Poultry litter' },
    category: 'livestock',
    fc: 0.8,
    fcp: 0.5,
    fs: 0.9,
    fl: 0.75,
    bmp: 0.22,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': 'Sistemas comerciais; 80% coletável', en: 'Commercial operations; 80% collectable' },
      fcp: { 'pt-BR': 'Compete com ração animal; 50% não-disponível', en: 'Competes with animal feed; 50% unavailable' },
      fs: { 'pt-BR': 'Safra continua; variação ~10%', en: 'Year-round production; ~10% variation' },
      fl: { 'pt-BR': 'Concentrado litoral; 30km transporte', en: 'Concentrated near the coast; 30 km transport' },
    },
  },
  
  // Agricultural: sugarcane
  {
    code: 'AG_CANA_BAGACO',
    name: { 'pt-BR': 'Bagaço de Cana', en: 'Sugarcane bagasse' },
    category: 'agricultural',
    fc: 0.95,
    fcp: 1.0,
    fs: 0.9,
    fl: 0.9,
    bmp: 0.35,
    rpr: 0.28,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': '95% gerado em usinas centralizadas', en: '95% generated at centralized mills' },
      fcp: { 'pt-BR': '🚨 CRÍTICO: 100% cogeração CETESB obrigatória → 0% disponível', en: '🚨 CRITICAL: 100% goes to cogeneration, required by CETESB → 0% available' },
      fs: SUGARCANE_HARVEST,
      fl: { 'pt-BR': 'Co-localizado; <5km; alta viabilidade', en: 'Co-located; <5 km; highly viable' },
    },
  },
  {
    code: 'AG_CANA_PALHA',
    name: { 'pt-BR': 'Palha de Cana', en: 'Sugarcane straw' },
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.9,
    fs: 0.9,
    fl: 0.85,
    bmp: 0.3,
    rpr: 0.14,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '85% coletável mecanicamente', en: '85% mechanically collectable' },
      fcp: { 'pt-BR': '🚨 CRÍTICO: 90% retenção solo 5-15t/ha UNESP → 10% disponível', en: '🚨 CRITICAL: 90% stays on the soil (5–15 t/ha, UNESP) → 10% available' },
      fs: SUGARCANE_HARVEST,
      fl: { 'pt-BR': 'Co-localizado; <10km econômico', en: 'Co-located; economical under 10 km' },
    },
  },
  {
    code: 'AG_CANA_TORTA_FILTRO',
    name: { 'pt-BR': 'Torta de Filtro (cana)', en: 'Filter cake (sugarcane)' },
    category: 'agricultural',
    fc: 0.95,
    fcp: 0.67,
    fs: 0.9,
    fl: 0.9,
    bmp: 0.28,
    rpr: 0.03,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': '95% gerado centralizado em filtros', en: '95% generated centrally at the filters' },
      fcp: { 'pt-BR': 'UNICA: 67% fertilização → 33% disponível excedente', en: 'UNICA: 67% used as fertilizer → 33% surplus available' },
      fs: SUGARCANE_HARVEST,
      fl: { 'pt-BR': 'Co-localizado; <15km viável', en: 'Co-located; viable under 15 km' },
    },
  },
  {
    code: 'AG_CANA_VINHACA',
    name: { 'pt-BR': 'Vinhaça (caldo destilação etanol)', en: 'Vinasse (ethanol distillation residue)' },
    category: 'agricultural',
    fc: 0.95,
    fcp: 0.85,
    fs: 0.9,
    fl: 0.9,
    bmp: 0.35,
    rpr: 0.12,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': '95% gerado em destilarias', en: '95% generated at distilleries' },
      fcp: { 'pt-BR': '🚨 CETESB P4.231 fertirrigação obrigatória 85% → 15% excedente', en: '🚨 CETESB P4.231 mandates fertigation for 85% → 15% surplus' },
      fs: SUGARCANE_HARVEST,
      fl: { 'pt-BR': 'Co-localizado; pipeline on-site', en: 'Co-located; on-site pipeline' },
    },
  },
  
  // Agricultural: corn
  {
    code: 'AG_MILHO_PALHA',
    name: { 'pt-BR': 'Palha de Milho', en: 'Corn stover' },
    category: 'agricultural',
    fc: 0.7,
    fcp: 0.85,
    fs: 0.85,
    fl: 0.6,
    bmp: 0.25,
    confidence: 'LOW',
    justification: {
      fc: { 'pt-BR': '70% recuperável campo; colheita mecânica', en: '70% recoverable in the field; mechanical harvesting' },
      fcp: { 'pt-BR': '85% PD exige cobertura 3-5t/ha → 15% disponível', en: '85%: no-till farming needs 3–5 t/ha of cover → 15% available' },
      fs: { 'pt-BR': 'Safra milho: Fevereiro-Maio; 85%', en: 'Corn harvest: February–May; 85%' },
      fl: { 'pt-BR': 'Disperso região; 50-100km; marginal', en: 'Dispersed across the region; 50–100 km; marginal' },
    },
  },
  
  // Agricultural: soybean
  {
    code: 'AG_SOJA_PALHA',
    name: { 'pt-BR': 'Palha de Soja', en: 'Soybean straw' },
    category: 'agricultural',
    fc: 0.6,
    fcp: 1.0,
    fs: 0.8,
    fl: 0.6,
    bmp: 0.22,
    confidence: 'HIGH',
    justification: {
      fc: { 'pt-BR': '60% recuperável; soja baixa palha 2-3t/ha', en: '60% recoverable; soybean leaves little straw (2–3 t/ha)' },
      fcp: { 'pt-BR': '🚨 CRÍTICO: 100% PD; certificação exige cobertura → 0% disponível', en: '🚨 CRITICAL: 100% no-till; certification requires ground cover → 0% available' },
      fs: { 'pt-BR': 'Safra soja: Janeiro-Fevereiro; 80%', en: 'Soybean harvest: January–February; 80%' },
      fl: { 'pt-BR': 'Disperso; 60-100km inviável', en: 'Dispersed; 60–100 km, not viable' },
    },
  },
  
  // Agricultural: citrus
  {
    code: 'AG_CITROS_BAGACO',
    name: { 'pt-BR': 'Bagaço de Citros', en: 'Citrus bagasse' },
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.7,
    fs: 0.9,
    fl: 0.75,
    bmp: 0.28,
    rpr: 0.50,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '85% processamento suco concentrado', en: '85% from concentrated juice processing' },
      fcp: { 'pt-BR': '🚨 REGIONAL: Bebedouro (Cargill) varia geograficamente', en: '🚨 REGIONAL: Bebedouro (Cargill); varies by location' },
      fs: CITRUS_HARVEST,
      fl: CITRUS_BELT,
    },
  },
  {
    code: 'AG_CITROS_CASCAS',
    name: { 'pt-BR': 'Cascas de Citros', en: 'Citrus peels' },
    category: 'agricultural',
    fc: 0.8,
    fcp: 0.7,
    fs: 0.9,
    fl: 0.75,
    bmp: 0.25,
    rpr: 0.30,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '80% descascamento/processamento', en: '80% from peeling/processing' },
      fcp: { 'pt-BR': 'Similar bagaço citros - competição pectina regional', en: 'Like citrus bagasse: regional competition from pectin production' },
      fs: CITRUS_HARVEST,
      fl: CITRUS_BELT,
    },
  },
  {
    code: 'AG_CITROS_POLPA',
    name: { 'pt-BR': 'Polpa de Citros (resíduo seco)', en: 'Citrus pulp (dry residue)' },
    category: 'agricultural',
    fc: 0.75,
    fcp: 0.75,
    fs: 0.9,
    fl: 0.7,
    bmp: 0.2,
    rpr: 0.20,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '75% secagem polpa', en: '75% from pulp drying' },
      fcp: { 'pt-BR': '75% vai ração animal (produto comercial) → 25% disponível', en: '75% goes to animal feed (a commercial product) → 25% available' },
      fs: { 'pt-BR': 'Safra citros; 90%', en: 'Citrus harvest; 90%' },
      fl: { 'pt-BR': 'Polpa transportável; 40-60km', en: 'Pulp is transportable; 40–60 km' },
    },
  },
  
  // Agricultural: coffee
  {
    code: 'AG_CAFE_POLPA',
    name: { 'pt-BR': 'Polpa de Café', en: 'Coffee pulp' },
    category: 'agricultural',
    fc: 0.8,
    fcp: 0.6,
    fs: 0.85,
    fl: 0.7,
    bmp: 0.32,
    rpr: 0.45,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '80% beneficiamento via úmida', en: '80% from wet processing' },
      fcp: { 'pt-BR': '60% compostagem cafezais + ração → 40% disponível', en: '60% composted on coffee farms or fed to animals → 40% available' },
      fs: COFFEE_HARVEST,
      fl: { 'pt-BR': 'Região cafeeira; 40-60km', en: 'Coffee-growing region; 40–60 km' },
    },
  },
  {
    code: 'AG_CAFE_CASCA',
    name: { 'pt-BR': 'Casca de Café', en: 'Coffee husk' },
    category: 'agricultural',
    fc: 0.7,
    fcp: 0.5,
    fs: 0.85,
    fl: 0.65,
    bmp: 0.25,
    rpr: 0.35,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '70% beneficiamento', en: '70% from processing' },
      fcp: { 'pt-BR': '50% combustível fornalhas + compostagem → 50% disponível', en: '50% burned in furnaces or composted → 50% available' },
      fs: COFFEE_HARVEST,
      fl: { 'pt-BR': 'Disperso região; 60-80km', en: 'Dispersed across the region; 60–80 km' },
    },
  },
  {
    code: 'AG_CAFE_MUCILAGEM',
    name: { 'pt-BR': 'Mucilagem de Café', en: 'Coffee mucilage' },
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.55,
    fs: 0.8,
    fl: 0.7,
    bmp: 0.35,
    rpr: 0.20,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '85% despolpamento via úmida', en: '85% from wet pulping' },
      fcp: { 'pt-BR': '55% compostagem + fermentação → 45% disponível', en: '55% composted or fermented → 45% available' },
      fs: { 'pt-BR': 'Safra café via úmida; 80%', en: 'Wet-process coffee harvest; 80%' },
      fl: { 'pt-BR': 'Benefícios via úmida; 45-65km', en: 'Wet-processing mills; 45–65 km' },
    },
  },

  // Industrial

  {
    code: 'IND_BAGACO_MALTE',
    name: { 'pt-BR': 'Bagaço de Malte', en: 'Brewers\' spent grain' },
    category: 'industrial',
    fc: 0.85,
    fcp: 0.70,
    fs: 0.95,
    fl: 0.75,
    bmp: 0.28,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '85% coletável em cervejarias', en: '85% collectable at breweries' },
      fcp: { 'pt-BR': '70% competição com ração animal (R$ 80-120/ton)', en: '70% competes with animal feed (R$ 80–120/t)' },
      fs: { 'pt-BR': 'Produção contínua; 95% do ano', en: 'Continuous production; 95% of the year' },
      fl: { 'pt-BR': 'Cervejarias concentradas; 20-30km', en: 'Breweries are concentrated; 20–30 km' },
    },
  },

  {
    code: 'IND_TRUB_CERVEJA',
    name: { 'pt-BR': 'Trub (cervejaria)', en: 'Trub (brewery)' },
    category: 'industrial',
    fc: 0.80,
    fcp: 0.75,
    fs: 0.95,
    fl: 0.70,
    bmp: 0.20,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '80% coletável em processo cervejeiro', en: '80% collectable in the brewing process' },
      fcp: { 'pt-BR': '75% competição com uso industrial', en: '75% competes with industrial uses' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Cervejarias; 25km média', en: 'Breweries; 25 km on average' },
    },
  },

  {
    code: 'IND_SORO_LATICINIOS',
    name: { 'pt-BR': 'Soro de Laticínios', en: 'Dairy whey' },
    category: 'industrial',
    fc: 0.75,
    fcp: 0.60,
    fs: 0.95,
    fl: 0.65,
    bmp: 0.38,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '75% coletável em laticínios', en: '75% collectable at dairies' },
      fcp: { 'pt-BR': '60% EMBRAPA: ração animal → 40% disponível', en: 'EMBRAPA: 60% goes to animal feed → 40% available' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Laticínios dispersos; 50-80km (líquido)', en: 'Dairies are dispersed; 50–80 km (liquid)' },
    },
  },

  {
    code: 'IND_RESIDUO_ABATEDOURO',
    name: { 'pt-BR': 'Resíduos Abatedouro', en: 'Slaughterhouse waste' },
    category: 'industrial',
    fc: 0.70,
    fcp: 0.50,
    fs: 0.95,
    fl: 0.70,
    bmp: 0.30,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '70% coletável (separação resíduos)', en: '70% collectable (waste separation)' },
      fcp: { 'pt-BR': '50% competição com adubo/ração', en: '50% competes with fertilizer/feed' },
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Polos frigoríficos; 25-35km', en: 'Meatpacking hubs; 25–35 km' },
    },
  },

  {
    code: 'IND_VISCERAS_NAO_COMESTIVEIS',
    name: { 'pt-BR': 'Vísceras Não Comestíveis', en: 'Inedible offal' },
    category: 'industrial',
    fc: 0.75,
    fcp: 0.55,
    fs: 0.95,
    fl: 0.75,
    bmp: 0.35,
    confidence: 'MEDIUM',
    justification: {
      fc: { 'pt-BR': '75% coletável (separação)', en: '75% collectable (separation)' },
      fcp: { 'pt-BR': '55% compete com farinha animal (MAPA)', en: '55% competes with rendering into animal meal (MAPA)' }, // i18n-exempt: MAPA, Brazil's agriculture ministry
      fs: CONTINUOUS_GENERATION,
      fl: { 'pt-BR': 'Polos frigoríficos regionais; viável', en: 'Regional meatpacking hubs; viable' },
    },
  },

  {
    code: 'IND_RESIDUO_PROCESSAMENTO_VEGETAL',
    name: { 'pt-BR': 'Resíduos Processamento Vegetal', en: 'Vegetable processing waste' },
    category: 'industrial',
    fc: 0.60,
    fcp: 0.70,
    fs: 0.80,
    fl: 0.60,
    bmp: 0.22,
    confidence: 'LOW',
    justification: {
      fc: { 'pt-BR': '60% coletável; varia por tipo', en: '60% collectable; varies by type' },
      fcp: { 'pt-BR': '70% competição com compostagem/ração', en: '70% competes with composting/feed' },
      fs: { 'pt-BR': 'Processamento contínuo; ~20% variação', en: 'Continuous processing; ~20% variation' },
      fl: { 'pt-BR': 'Região dispersa; transporte custoso', en: 'Dispersed region; costly transport' },
    },
  },

  {
    code: 'IND_CASCA_EUCALIPTO',
    name: { 'pt-BR': 'Casca de Eucalipto (florestal)', en: 'Eucalyptus bark (forestry)' },
    category: 'industrial',
    fc: 0.70,
    fcp: 0.50,
    fs: 0.85,
    fl: 0.50,
    bmp: 0.20,
    confidence: 'LOW',
    justification: {
      fc: { 'pt-BR': '70% coletável em processamento madeira', en: '70% collectable at wood processing' },
      fcp: { 'pt-BR': '50% competição com energia térmica/celulose', en: '50% competes with thermal energy/pulp' },
      fs: { 'pt-BR': 'Processamento contínuo; ~15% variação', en: 'Continuous processing; ~15% variation' },
      fl: { 'pt-BR': '🚨 Baixa densidade (150-200 kg/m³); >50km inviável', en: '🚨 Low density (150–200 kg/m³); not viable beyond 50 km' },
    },
  }
]

// Group residues by category
export const getResiduesByCategory = (category: string): DetailedResidue[] => {
  return DETAILED_RESIDUES.filter(r => r.category === category)
}

// Get residue by code
export const getResidueByCode = (code: string): DetailedResidue | undefined => {
  return DETAILED_RESIDUES.find(r => r.code === code)
}

/** The crop an agricultural residue comes from; names: Map.residues.<crop>. */
export type ParentCrop = 'sugarcane' | 'corn' | 'soybean' | 'citrus' | 'coffee' | 'other'

// Get parent crop/source for agricultural residues
export const getParentCrop = (code: string): ParentCrop => {
  if (code.startsWith('AG_CANA_')) return 'sugarcane'
  if (code.startsWith('AG_MILHO_')) return 'corn'
  if (code.startsWith('AG_SOJA_')) return 'soybean'
  if (code.startsWith('AG_CITROS_')) return 'citrus'
  if (code.startsWith('AG_CAFE_')) return 'coffee'
  return 'other'
}
