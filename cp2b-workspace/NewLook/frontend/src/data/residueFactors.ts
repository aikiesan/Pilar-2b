/**
 * Detailed Residue Data with Individual FDE Factors
 * Source: FDE_Disponibilidade_Residuos_CP2B.csv
 * Each residue has its own FC, FCp, FS, FL factors
 */

export interface DetailedResidue {
  code: string
  name: string
  sector: 'URBANO' | 'PECUÁRIA' | 'AGRICULTURA' | 'INDÚSTRIA'
  category: 'urban' | 'livestock' | 'agricultural' | 'industrial'
  
  // FDE Correction Factors
  fc: number      // Collection Factor
  fcp: number     // Competition Factor  
  fs: number      // Seasonal Factor
  fl: number      // Logistics Factor
  fde: number     // Final FDE (%)
  
  // Technical Data
  bmp: number     // Biochemical Methane Potential (m³/kg SV)
  // Residue-to-Product Ratio: fraction of this sub-residue relative to parent crop mass.
  // Used to apportion a shared DB stream (e.g. "sugarcane") among multiple frontend codes.
  // Omit (or set 1.0) for residues with a 1-to-1 stream mapping.
  rpr?: number
  classification: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  
  // Justifications
  fcJustification: string
  fcpJustification: string
  fsJustification: string
  flJustification: string
  
  // Observations
  observation?: string
  potentialSP?: string
}

export const DETAILED_RESIDUES: DetailedResidue[] = [
  // URBANO
  {
    code: 'URB_LODO_PRIMARIO',
    name: 'Lodo Primário (ETEs)',
    sector: 'URBANO',
    category: 'urban',
    fc: 0.85,
    fcp: 0.25,
    fs: 0.95,
    fl: 0.9,
    fde: 54.51,
    bmp: 0.25,
    rpr: 0.40,
    classification: '🟢 EXCEPCIONAL (40%+)',
    confidence: 'HIGH',
    fcJustification: 'ETEs centralizam; 85% coletável peneiramento',
    fcpJustification: 'CETESB/SABESP: 25% compostagem/agricultura → 75% disponível',
    fsJustification: 'Geração contínua; 95% do ano',
    flJustification: 'Centralizado ETEs; 15-20km; viável',
    potentialSP: '~500k ton/ano',
    observation: 'SABESP: ETEs maiores com biodigestores; validar co-investimento'
  },
  {
    code: 'URB_LODO_SECUNDARIO',
    name: 'Lodo Secundário (ETEs)',
    sector: 'URBANO',
    category: 'urban',
    fc: 0.82,
    fcp: 0.3,
    fs: 0.95,
    fl: 0.85,
    fde: 46.35,
    bmp: 0.28,
    rpr: 0.40,
    classification: '🟢 EXCEPCIONAL (40%+)',
    confidence: 'HIGH',
    fcJustification: 'Sistemas secundários; 82% coletável',
    fcpJustification: 'CETESB: 30% fertilização → 70% disponível',
    fsJustification: 'Geração contínua; 95% do ano',
    flJustification: 'Centralizado ETEs; 15-25km; viável',
    potentialSP: '~300k ton/ano',
    observation: 'Maior MO que primário; excelente para biogás'
  },
  {
    code: 'URB_FORSU_SEPARADA',
    name: 'FORSU - Fração Orgânica Separada',
    sector: 'URBANO',
    category: 'urban',
    fc: 0.9,
    fcp: 0.35,
    fs: 0.9,
    fl: 0.8,
    // TODO(B-URG-4): generate DETAILED_RESIDUES from feedstocks.yaml.
    fde: 42.12,
    bmp: 0.36,
    rpr: 0.20,
    classification: '🟢 EXCEPCIONAL (40%+)',
    confidence: 'MEDIUM',
    fcJustification: 'Separação na fonte; 90% de pureza',
    fcpJustification: 'ABRELPE: 35% uso animal/compostagem → 65% disponível',
    fsJustification: 'Coleta seletiva; variação sazonal ~10%',
    flJustification: 'Distribuído pontos coleta; 25km; razoável',
    potentialSP: '~150k ton/ano',
    observation: 'Municipios coleta seletiva: São Paulo, Campinas, Santos'
  },
  
  // PECUÁRIA
  {
    code: 'PEC_DEJETOS_LIQUIDOS_SUINO',
    name: 'Dejetos Líquidos Suínos',
    sector: 'PECUÁRIA',
    category: 'livestock',
    fc: 0.9,
    fcp: 0.45,
    fs: 0.95,
    fl: 0.75,
    fde: 35.27,
    // TODO(B-URG-4): generate DETAILED_RESIDUES from feedstocks.yaml.
    bmp: 0.245,
    classification: '🟢 MUITO BOM (25-39%)',
    confidence: 'HIGH',
    fcJustification: 'Sistemas confinados; 90% coletável',
    fcpJustification: 'EMBRAPA: 45% fertirrigação direta → 55% disponível',
    fsJustification: 'Geração contínua; 95% do ano',
    flJustification: 'Concentrado regiões; viável transporte',
    potentialSP: '~2,5M m³/ano',
    observation: 'Alto potencial metanogênico; Marília, Sorocaba concentram'
  },
  {
    code: 'PEC_ESTERCO_BOVINO',
    name: 'Esterco Bovino',
    sector: 'PECUÁRIA',
    category: 'livestock',
    fc: 0.8,
    fcp: 0.55,
    fs: 0.85,
    fl: 0.7,
    fde: 19.32,
    bmp: 0.18,
    classification: '🟡 BOM (15-24%)',
    confidence: 'HIGH',
    fcJustification: 'Confinamento; 80% coletável',
    fcpJustification: 'EMBRAPA: 55% fertilização → 45% disponível',
    fsJustification: 'Sazonalidade moderada ~15%',
    flJustification: 'Dispersão regional; transporte moderado',
    potentialSP: '~15M ton/ano',
    observation: 'Necessita co-digestão; dispersão geográfica'
  },
  {
    code: 'PEC_CAMA_AVIARIO',
    name: 'Cama de Aviário',
    sector: 'PECUÁRIA',
    category: 'livestock',
    fc: 0.8,
    fcp: 0.5,
    fs: 0.9,
    fl: 0.75,
    fde: 27.0,
    bmp: 0.22,
    classification: '🟢 MUITO BOM (25-39%)',
    confidence: 'MEDIUM',
    fcJustification: 'Sistemas comerciais; 80% coletável',
    fcpJustification: 'Compete com ração animal; 50% não-disponível',
    fsJustification: 'Safra continua; variação ~10%',
    flJustification: 'Concentrado litoral; 30km transporte',
    potentialSP: '~800k ton/ano',
    observation: 'Competição ração animal não quantificada; validar'
  },
  
  // AGRICULTURA - CANA
  {
    code: 'AG_CANA_BAGACO',
    name: 'Bagaço de Cana',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.95,
    fcp: 0.78,
    fs: 0.9,
    fl: 0.9,
    // TODO(B-URG-4): generate DETAILED_RESIDUES from feedstocks.yaml.
    fde: 16.93,
    bmp: 0.165,
    rpr: 0.28,
    classification: '🟡 BOM (15-24%)',
    confidence: 'HIGH',
    fcJustification: '95% gerado em usinas centralizadas',
    fcpJustification: 'EPE BEN 2024: 78% em cogeração → 22% de excedente disponível',
    fsJustification: 'Safra cana: Abril-Novembro',
    flJustification: 'Co-localizado; <5km; alta viabilidade',
    potentialSP: 'FCo disponível: 22%',
    observation: 'Disponibilidade canônica: FC 0,95 × FCo 0,22 × FS 0,90 × FL 0,90'
  },
  {
    code: 'AG_CANA_PALHA',
    name: 'Palha de Cana',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.9,
    fs: 0.9,
    fl: 0.85,
    fde: 6.5,
    bmp: 0.3,
    rpr: 0.14,
    classification: '🟠 REGULAR (5-9%)',
    confidence: 'MEDIUM',
    fcJustification: '85% coletável mecanicamente',
    fcpJustification: '🚨 CRÍTICO: 90% retenção solo 5-15t/ha UNESP → 10% disponível',
    fsJustification: 'Safra cana: Abril-Novembro',
    flJustification: 'Co-localizado; <10km econômico',
    potentialSP: '~50k ton/ano',
    observation: '🚨 FDE REAL=0-2%: Retenção solo obrigatória'
  },
  {
    code: 'AG_CANA_TORTA_FILTRO',
    name: 'Torta de Filtro (cana)',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.95,
    fcp: 0.67,
    fs: 0.9,
    fl: 0.9,
    fde: 25.39,
    bmp: 0.28,
    rpr: 0.03,
    classification: '🟢 MUITO BOM (25-39%)',
    confidence: 'HIGH',
    fcJustification: '95% gerado centralizado em filtros',
    fcpJustification: 'UNICA: 67% fertilização → 33% disponível excedente',
    fsJustification: 'Safra cana: Abril-Novembro',
    flJustification: 'Co-localizado; <15km viável',
    potentialSP: '~4M ton/ano',
    observation: 'Excedente validado UNICA; co-digestão com vinhaça otimiza'
  },
  {
    code: 'AG_CANA_VINHACA',
    name: 'Vinhaça (caldo destilação etanol)',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.95,
    fcp: 0.85,
    fs: 0.9,
    fl: 0.9,
    fde: 11.54,
    // TODO(B-URG-4): generate DETAILED_RESIDUES from feedstocks.yaml.
    bmp: 0.16,
    rpr: 0.12,
    classification: '🟡 RAZOÁVEL (10-14%)',
    confidence: 'HIGH',
    fcJustification: '95% gerado em destilarias',
    fcpJustification: '🚨 CETESB P4.231 fertirrigação obrigatória 85% → 15% excedente',
    fsJustification: 'Safra cana: Abril-Novembro',
    flJustification: 'Co-localizado; pipeline on-site',
    potentialSP: '~10M m³/ano',
    observation: '🚨 CETESB P4.231 fertirrigação mandatória 85%'
  },
  
  // AGRICULTURA - MILHO
  {
    code: 'AG_MILHO_PALHA',
    name: 'Palha de Milho',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.7,
    fcp: 0.85,
    fs: 0.85,
    fl: 0.6,
    fde: 5.36,
    bmp: 0.25,
    classification: '🟠 REGULAR (5-9%)',
    confidence: 'LOW',
    fcJustification: '70% recuperável campo; colheita mecânica',
    fcpJustification: '85% PD exige cobertura 3-5t/ha → 15% disponível',
    fsJustification: 'Safra milho: Fevereiro-Maio; 85%',
    flJustification: 'Disperso região; 50-100km; marginal',
    potentialSP: '~100k ton/ano',
    observation: 'Plantio direto 70% SP; competição silagem'
  },
  
  // AGRICULTURA - SOJA
  {
    code: 'AG_SOJA_PALHA',
    name: 'Palha de Soja',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.6,
    fcp: 1.0,
    fs: 0.8,
    fl: 0.6,
    fde: 0.0,
    bmp: 0.22,
    classification: '⚫ INVIÁVEL (0%)',
    confidence: 'HIGH',
    fcJustification: '60% recuperável; soja baixa palha 2-3t/ha',
    fcpJustification: '🚨 CRÍTICO: 100% PD; certificação exige cobertura → 0% disponível',
    fsJustification: 'Safra soja: Janeiro-Fevereiro; 80%',
    flJustification: 'Disperso; 60-100km inviável',
    potentialSP: 'ZERO (inviável)',
    observation: '🚨 FDE=0% INVIÁVEL: 85% SP em PD; certificação exige cobertura'
  },
  
  // AGRICULTURA - CITROS
  {
    code: 'AG_CITROS_BAGACO',
    name: 'Bagaço de Citros',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.7,
    fs: 0.9,
    fl: 0.75,
    fde: 17.21,
    bmp: 0.28,
    rpr: 0.50,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '85% processamento suco concentrado',
    fcpJustification: '🚨 REGIONAL: Bebedouro (Cargill) varia geograficamente',
    fsJustification: 'Safra citros: Abril-Dezembro; 90%',
    flJustification: 'Cinturão citros; 30-40km',
    potentialSP: '~300k ton/ano (*)',
    observation: '🚨 REGIONALIZADO: Bebedouro 2-3%'
  },
  {
    code: 'AG_CITROS_CASCAS',
    name: 'Cascas de Citros',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.8,
    fcp: 0.7,
    fs: 0.9,
    fl: 0.75,
    fde: 16.2,
    bmp: 0.25,
    rpr: 0.30,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '80% descascamento/processamento',
    fcpJustification: 'Similar bagaço citros - competição pectina regional',
    fsJustification: 'Safra citros: Abril-Dezembro; 90%',
    flJustification: 'Cinturão citros; 30-40km',
    potentialSP: '~250k ton/ano (*)',
    observation: 'Competição pectina similar bagaço; regional'
  },
  {
    code: 'AG_CITROS_POLPA',
    name: 'Polpa de Citros (resíduo seco)',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.75,
    fcp: 0.75,
    fs: 0.9,
    fl: 0.7,
    fde: 11.81,
    bmp: 0.2,
    rpr: 0.20,
    classification: '🟡 RAZOÁVEL (10-14%)',
    confidence: 'MEDIUM',
    fcJustification: '75% secagem polpa',
    fcpJustification: '75% vai ração animal (produto comercial) → 25% disponível',
    fsJustification: 'Safra citros; 90%',
    flJustification: 'Polpa transportável; 40-60km',
    potentialSP: '~150k ton/ano',
    observation: 'Produto comercial (R$ 150-200/ton) compete'
  },
  
  // AGRICULTURA - CAFÉ
  {
    code: 'AG_CAFE_POLPA',
    name: 'Polpa de Café',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.8,
    fcp: 0.6,
    fs: 0.85,
    fl: 0.7,
    fde: 19.04,
    bmp: 0.32,
    rpr: 0.45,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '80% beneficiamento via úmida',
    fcpJustification: '60% compostagem cafezais + ração → 40% disponível',
    fsJustification: 'Safra café: Junho-Setembro; 85%',
    flJustification: 'Região cafeeira; 40-60km',
    potentialSP: '~200k ton/ano',
    observation: 'Via úmida domina arábica; focar grandes benefícios'
  },
  {
    code: 'AG_CAFE_CASCA',
    name: 'Casca de Café',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.7,
    fcp: 0.5,
    fs: 0.85,
    fl: 0.65,
    fde: 19.34,
    bmp: 0.25,
    rpr: 0.35,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '70% beneficiamento',
    fcpJustification: '50% combustível fornalhas + compostagem → 50% disponível',
    fsJustification: 'Safra café: Junho-Setembro; 85%',
    flJustification: 'Disperso região; 60-80km',
    potentialSP: '~100k ton/ano',
    observation: 'Casca queimada; compete energia térmica'
  },
  {
    code: 'AG_CAFE_MUCILAGEM',
    name: 'Mucilagem de Café',
    sector: 'AGRICULTURA',
    category: 'agricultural',
    fc: 0.85,
    fcp: 0.55,
    fs: 0.8,
    fl: 0.7,
    fde: 21.42,
    bmp: 0.35,
    rpr: 0.20,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '85% despolpamento via úmida',
    fcpJustification: '55% compostagem + fermentação → 45% disponível',
    fsJustification: 'Safra café via úmida; 80%',
    flJustification: 'Benefícios via úmida; 45-65km',
    potentialSP: '~120k ton/ano',
    observation: 'Apenas 30% café SP via úmida; potencial regional'
  },

  // ========================================
  // INDUSTRIAL RESIDUES (7 types)
  // ========================================

  // 1. Bagaço de Malte (Malt Bagasse) - Brewery
  {
    code: 'IND_BAGACO_MALTE',
    name: 'Bagaço de Malte',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.85,
    fcp: 0.70,
    fs: 0.95,
    fl: 0.75,
    fde: 18.09,
    bmp: 0.28,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '85% coletável em cervejarias',
    fcpJustification: '70% competição com ração animal (R$ 80-120/ton)',
    fsJustification: 'Produção contínua; 95% ano',
    flJustification: 'Cervejarias concentradas; 20-30km',
    potentialSP: '~50k ton/ano',
    observation: 'Forte competição com ração animal; mercado estabelecido'
  },

  // 2. Trub (cervejaria) - Brewery
  {
    code: 'IND_TRUB_CERVEJA',
    name: 'Trub (cervejaria)',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.80,
    fcp: 0.75,
    fs: 0.95,
    fl: 0.70,
    fde: 13.30,
    bmp: 0.20,
    classification: '🟡 RAZOÁVEL (10-14%)',
    confidence: 'MEDIUM',
    fcJustification: '80% coletável em processo cervejeiro',
    fcpJustification: '75% competição com uso industrial',
    fsJustification: 'Geração contínua; 95% ano',
    flJustification: 'Cervejarias; 25km média',
    potentialSP: '~15k ton/ano',
    observation: 'Quantidade menor; alta heterogeneidade'
  },

  // 3. Soro de Laticínios (Dairy Whey) - Highest BMP!
  {
    code: 'IND_SORO_LATICINIOS',
    name: 'Soro de Laticínios',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.75,
    fcp: 0.60,
    fs: 0.95,
    fl: 0.65,
    fde: 17.81,
    bmp: 0.38,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '75% coletável em laticínios',
    fcpJustification: '60% EMBRAPA: ração animal → 40% disponível',
    fsJustification: 'Geração contínua; 95% ano',
    flJustification: 'Laticínios dispersos; 50-80km (líquido)',
    potentialSP: '~80k ton/ano',
    observation: 'Alto BMP (0.38) mas transporte líquido custoso'
  },

  // 4. Resíduos Abatedouro - Meat Processing
  {
    code: 'IND_RESIDUO_ABATEDOURO',
    name: 'Resíduos Abatedouro',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.70,
    fcp: 0.50,
    fs: 0.95,
    fl: 0.70,
    fde: 23.33,
    bmp: 0.30,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '70% coletável (separação resíduos)',
    fcpJustification: '50% competição com adubo/ração',
    fsJustification: 'Geração contínua; 95% ano',
    flJustification: 'Polos frigoríficos; 25-35km',
    potentialSP: '~40k ton/ano',
    observation: 'Alta heterogeneidade; restrições MAPA'
  },

  // 5. Vísceras Não Comestíveis - Highest FDE!
  {
    code: 'IND_VISCERAS_NAO_COMESTIVEIS',
    name: 'Vísceras Não Comestíveis',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.75,
    fcp: 0.55,
    fs: 0.95,
    fl: 0.75,
    fde: 24.05,
    bmp: 0.35,
    classification: '🟡 BOM (15-24%)',
    confidence: 'MEDIUM',
    fcJustification: '75% coletável (separação)',
    fcpJustification: '55% compete com farinha animal (MAPA)',
    fsJustification: 'Geração contínua; 95% ano',
    flJustification: 'Polos frigoríficos regionais; viável',
    potentialSP: '~50k ton/ano',
    observation: 'Regulamentações MAPA rigorosas; farinha animal priorizada'
  },

  // 6. Resíduos Processamento Vegetal
  {
    code: 'IND_RESIDUO_PROCESSAMENTO_VEGETAL',
    name: 'Resíduos Processamento Vegetal',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.60,
    fcp: 0.70,
    fs: 0.80,
    fl: 0.60,
    fde: 8.64,
    bmp: 0.22,
    classification: '🟠 REGULAR (5-9%)',
    confidence: 'LOW',
    fcJustification: '60% coletável; varia por tipo',
    fcpJustification: '70% competição com compostagem/ração',
    fsJustification: 'Processamento contínuo; ~20% variação',
    flJustification: 'Região dispersa; transporte custoso',
    potentialSP: '~150k ton/ano',
    observation: 'Cadeias valor não mapeadas; alta heterogeneidade'
  },

  // 7. Casca de Eucalipto (Eucalyptus Bark - Forestry)
  {
    code: 'IND_CASCA_EUCALIPTO',
    name: 'Casca de Eucalipto (florestal)',
    category: 'industrial',
    sector: 'INDÚSTRIA',
    fc: 0.70,
    fcp: 0.50,
    fs: 0.85,
    fl: 0.50,
    fde: 14.88,
    bmp: 0.20,
    classification: '🟡 RAZOÁVEL (10-14%)',
    confidence: 'LOW',
    fcJustification: '70% coletável em processamento madeira',
    fcpJustification: '50% competição com energia térmica/celulose',
    fsJustification: 'Processamento contínuo; ~15% variação',
    flJustification: '🚨 Baixa densidade (150-200 kg/m³); >50km inviável',
    potentialSP: '~200k ton/ano',
    observation: '🚨 Densidade baixa; necessita densificação para transporte'
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

// Get parent crop/source for agricultural residues
export const getParentCrop = (code: string): string => {
  if (code.startsWith('AG_CANA_')) return 'Cana-de-Açúcar'
  if (code.startsWith('AG_MILHO_')) return 'Milho'
  if (code.startsWith('AG_SOJA_')) return 'Soja'
  if (code.startsWith('AG_CITROS_')) return 'Citros'
  if (code.startsWith('AG_CAFE_')) return 'Café'
  return 'Outros'
}

