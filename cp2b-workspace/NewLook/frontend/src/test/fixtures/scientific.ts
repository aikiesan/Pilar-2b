import type { KineticData, LiteratureReference, ResidueRecord, SectorSummary } from '@/types/scientific'

export const residues: ResidueRecord[] = [
  {
    id: 1, codigo: 'VINHACA', nome: 'Vinhaça', nome_en: 'Vinasse', sector_codigo: 'AG_AGRICULTURA',
    bmp_medio: 280.4, bmp_min: 220, bmp_max: 320, ts_medio: 3.7, vs_medio: 61.2, chemical_cn_ratio: 16.8,
    chemical_ch4_content: 60, fc_medio: 0.95, fcp_medio: 0.85, fs_medio: 0.6, fl_medio: 0.9, reference_count: 2,
  },
  {
    id: 2, codigo: 'ESTERCO_BOVINO', nome: 'Esterco bovino', nome_en: 'Cattle manure', sector_codigo: 'PC_PECUARIA',
    bmp_medio: 210, chemical_cn_ratio: 24, reference_count: 0,
  },
  { id: 3, codigo: 'LODO_PRIMARIO', nome: 'Lodo primário', sector_codigo: 'UR_URBANO', bmp_medio: 300, chemical_cn_ratio: null },
]

export const sectors: SectorSummary[] = [
  { codigo: 'AG_AGRICULTURA', emoji: '🌾', ordem: 1, num_residuos: 1, total_references: 2 },
  { codigo: 'PC_PECUARIA', emoji: '🐄', ordem: 2, num_residuos: 1, total_references: 1 },
  { codigo: 'UR_URBANO', emoji: '🏙️', ordem: 3, num_residuos: 1, total_references: 0 },
]

export const references: LiteratureReference[] = [
  {
    id: 10, authors: 'Moraes, B. S.', title: 'Anaerobic digestion of vinasse', journal: 'Applied Energy', year: 2015,
    doi: '10.1016/j.apenergy.2014.x', url: null, validated: true, sector: 'AG_AGRICULTURA',
    residue: { nome: 'Vinhaça', nome_en: 'Vinasse' },
  },
  {
    id: 11, authors: 'Kunz, A.', title: 'Dejetos de bovinos: caracterização', journal: null, year: 2004,
    doi: null, url: 'https://example.org/kunz', validated: false, sector: 'PC_PECUARIA',
    residue: { nome: 'Esterco bovino', nome_en: 'Cattle manure' },
  },
]

const kinetic = (id: number, name: string, extra: Partial<KineticData> = {}): KineticData => ({
  residue_id: id, residue_name: name, sector: 'AG_AGRICULTURA', k_slow: 0.05, k_med: 0.5, k_fast: 5,
  f_slow: 0.3, f_med: 0.5, f_fast: 0.15, fq: 0.95, classification: 'medium', bmp_experimental: 200,
  bmp_simulated: 210, t50: 8, t80: 18, ...extra,
})

export const kinetics: KineticData[] = [
  kinetic(1, 'Vinhaça', { classification: 'fast' }),
  kinetic(2, 'Esterco bovino', { classification: 'medium-fast', bmp_simulated: 200 }),
]
