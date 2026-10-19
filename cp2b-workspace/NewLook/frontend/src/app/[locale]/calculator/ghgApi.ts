/**
 * Avoided emissions of the simulated plant, from the backend GHG module
 * (POST /api/v1/ghg/estimate, docs/data/ESPEC_MODULO_GEE.md). The calculator
 * computes no CO₂ itself: one engine, one set of parameters (ghg.yaml).
 */

import type { ActivityType, OutputType } from './calculatorEngine'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/** Keys of ghg.yaml `linhas_de_base`; names: calculator.climate.baselines.<key>. */
export type GhgBaseline =
  | 'nao_informado'
  | 'lagoa_anaerobia'
  | 'esterqueira'
  | 'armazenamento_solido'
  | 'cama_aviario'
  | 'pasto'
  | 'espalhamento_diario'
  | 'campo'

/** Keys of ghg.yaml `rotas`; names: calculator.climate.routes.<key>. */
export type GhgRoute = 'biometano_veicular' | 'biometano_rede' | 'eletricidade' | 'termico_glp'

/** Upgrading keys of ghg.yaml `emissoes_projeto.slip`; names: calculator.climate.slip.<key>. */
export type GhgUpgrading = 'lavagem_agua' | 'aminas' | 'membranas' | 'psa'

export const UPGRADING_TECHNOLOGIES: GhgUpgrading[] = ['lavagem_agua', 'aminas', 'membranas', 'psa']
export const UPGRADING_ROUTES: ReadonlySet<GhgRoute> = new Set(['biometano_veicular', 'biometano_rede'])

const MANURE: GhgBaseline[] = ['lagoa_anaerobia', 'esterqueira', 'armazenamento_solido', 'espalhamento_diario']

/** What the user may say happens to the residue today. "Não informado" always comes
 *  first: without an answer only the displaced fossil fuel is counted (spec §4). */
export const BASELINE_OPTIONS: Record<ActivityType, GhgBaseline[]> = {
  swine: ['nao_informado', ...MANURE],
  cattle: ['nao_informado', ...MANURE, 'pasto'],
  poultry: ['nao_informado', 'cama_aviario', 'armazenamento_solido'],
  livestock: ['nao_informado', ...MANURE, 'pasto', 'cama_aviario'],
  sugarcane: ['nao_informado', 'campo'],
  corn: ['nao_informado', 'campo'],
  soy: ['nao_informado', 'campo'],
  coffee: ['nao_informado', 'campo'],
  citrus: ['nao_informado', 'campo'],
}

/** The route the selected products imply: biomethane first, as it displaces diesel. */
export function defaultRoute(selected: OutputType[]): GhgRoute {
  if (selected.includes('biomethane')) return 'biometano_veicular'
  if (selected.includes('energy')) return 'eletricidade'
  if (selected.includes('thermal')) return 'termico_glp'
  return 'biometano_veicular'
}

export interface GhgRequest {
  ch4_produced_nm3_year: number
  baseline: GhgBaseline
  route: GhgRoute
  slip_technology?: GhgUpgrading
  leak?: number
  electrical_efficiency?: number
}

export interface GhgEstimate {
  be_methane_t: number
  be_fossil_t: number
  pe_total_t: number
  er_net_t: number
  gwp_version: string
  gwp_value: number
  leak_break_even: number | null
  /** The values ghg.yaml supplied; only the leak is read here. */
  assumptions: { leak: number }
  unverified: string[]
}

export async function estimateGhg(req: GhgRequest, signal?: AbortSignal): Promise<GhgEstimate | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ghg/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}
