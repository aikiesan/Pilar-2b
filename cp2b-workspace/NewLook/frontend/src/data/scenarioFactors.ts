/**
 * Per-residue scenario multipliers for the map visualization.
 *
 * Derived from the backend canonical per-stream output
 * (compute_sp_canonical_totals.py → sp_canonical_by_stream.csv), normalised so the
 * map BASELINE = the "Médio Prazo" (realista) scenario = 1.0 per residue.
 * Each factor is scenario_biogas / medio_biogas for that residue's stream(s):
 *   - conservador  = min / medio
 *   - fronteira     = (medio + 0.5·(max−medio)) / medio   ← "Fronteira do Biogás"
 *   - otimista      = max / medio
 *
 * Applied per-municipality to each *_biogas_m3_year field, so each municipality
 * responds according to its own residue mix (NOT a uniform multiplier). Biomass
 * tonnage is unaffected — scenarios change availability, not the resource.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVISO (2026-07-25, Lote 1d) — a coluna `fronteira` está ÓRFÃ.
 *
 * A derivação `(medio + 0.5·(max−medio)) / medio` dependia de FRONTIER_ALPHA = 0.5,
 * que foi ELIMINADO do pipeline canônico. O cenário "Fronteira do Biogás" está
 * SUSPENSO e foi removido de MAP_SCENARIOS, portanto não aparece na interface.
 *
 * As onze constantes da coluna `fronteira` abaixo permanecem gravadas, mas
 * NENHUMA fórmula do repositório as reproduz hoje: elas não constam de
 * feedstocks.yaml e não são geradas por generate_from_canonical.py. Não as use
 * como fonte para nada, e não as atualize à mão.
 *
 * Pendências, escopo do Lote 5:
 *   1. gerar TODA esta tabela por generate_from_canonical.py, como as demais
 *      camadas, em vez de mantê-la digitada;
 *   2. decidir o destino da chave 'fronteira' em MapScenarioKey — o tipo foi
 *      mantido de propósito, porque removê-lo altera a assinatura usada pelo
 *      mapa, pelos painéis e por três arquivos de teste.
 *
 * Contexto: docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/AUDITORIA_CIRCULARIDADE_2026-07-25.md e
 * docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/INVENTARIO_FRONTEIRA_2026-07-25.md.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type MapScenarioKey = 'baseline' | 'conservador' | 'fronteira' | 'otimista';

export const SCENARIO_RESIDUE_FACTORS: Record<string, Record<MapScenarioKey, number>> = {
  sugarcane: { baseline: 1.0, conservador: 0.235, fronteira: 2.208, otimista: 3.417 },
  citrus:    { baseline: 1.0, conservador: 0.217, fronteira: 2.071, otimista: 3.142 },
  soybean:   { baseline: 1.0, conservador: 0.073, fronteira: 2.504, otimista: 4.008 },
  corn:      { baseline: 1.0, conservador: 0.104, fronteira: 1.869, otimista: 2.737 },
  coffee:    { baseline: 1.0, conservador: 0.328, fronteira: 1.799, otimista: 2.599 },
  cattle:    { baseline: 1.0, conservador: 0.083, fronteira: 4.862, otimista: 8.725 },
  swine:     { baseline: 1.0, conservador: 0.093, fronteira: 3.203, otimista: 5.406 },
  poultry:   { baseline: 1.0, conservador: 0.241, fronteira: 2.173, otimista: 3.345 },
  aquaculture: { baseline: 1.0, conservador: 1.0, fronteira: 1.0, otimista: 1.0 },
  rsu:       { baseline: 1.0, conservador: 0.196, fronteira: 2.349, otimista: 3.698 },
  rpo:       { baseline: 1.0, conservador: 0.025, fronteira: 6.273, otimista: 11.547 },
};

/**
 * Cenários oferecidos na interface. Esta lista — e não o tipo MapScenarioKey —
 * é o que o mapa e a bottom sheet renderizam.
 *
 * 'fronteira' foi retirada em 2026-07-25 (Lote 1d): o cenário está suspenso
 * enquanto sua definição não é decidida. O tipo continua a aceitá-la de
 * propósito, para não quebrar assinaturas; ver o aviso no topo deste arquivo.
 */
export const MAP_SCENARIOS: { key: MapScenarioKey; color: string }[] = [
  { key: 'conservador', color: '#F59E0B' },
  { key: 'baseline', color: '#3B82F6' },
  { key: 'otimista', color: '#22C55E' },
];

// Residue keys whose *_biogas_m3_year fields get scaled, in sector groups.
export const SCENARIO_SECTOR_RESIDUES: Record<'agricultural' | 'livestock' | 'urban', string[]> = {
  agricultural: ['sugarcane', 'citrus', 'soybean', 'corn', 'coffee'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo'],
};

/** Scale a municipality properties object's biogas fields by the scenario. Returns a new object. */
export function applyScenarioToProps<T extends Record<string, unknown>>(
  props: T,
  scenario: MapScenarioKey
): T {
  if (scenario === 'baseline') return props;
  const out: Record<string, unknown> = { ...props };
  const sectorTotals: Record<string, number> = { agricultural: 0, livestock: 0, urban: 0 };
  let total = 0;
  for (const [sector, residues] of Object.entries(SCENARIO_SECTOR_RESIDUES)) {
    for (const r of residues) {
      const field = `${r}_biogas_m3_year`;
      const base = Number((props as Record<string, unknown>)[field]) || 0;
      const factor = SCENARIO_RESIDUE_FACTORS[r]?.[scenario] ?? 1.0;
      const scaled = base * factor;
      out[field] = scaled;
      sectorTotals[sector] += scaled;
      total += scaled;
    }
    out[`${sector}_biogas_m3_year`] = sectorTotals[sector];
  }
  out.total_biogas_m3_year = total;
  return out as T;
}
