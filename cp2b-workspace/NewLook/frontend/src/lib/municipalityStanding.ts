/**
 * Where a municipality stands among its peers, for the map's profile panel:
 * its rank in the state and in its immediate region, the state's values from
 * largest to smallest (for the curve), the leader, the median and its share
 * of the state total.
 *
 * Computed in the browser from the features the map already loaded, so the
 * panel needs no extra request. Only municipalities with a numeric value
 * count; ties share a rank (1 + how many are strictly larger).
 */

type FeatureLike = { properties?: object | null }

export interface RegionRow {
  code: string
  name: string
  value: number
  rank: number
  self: boolean
}

export interface Standing {
  value: number
  stateRank: number
  stateCount: number
  stateTotal: number
  /** This municipality's share of the state total, 0–1. */
  share: number
  median: number
  leader: { name: string; value: number }
  /** The state's values, largest first. */
  curve: number[]
  region: string | null
  regionRank: number
  regionCount: number
  /** The region's top rows; the municipality itself always among them. */
  regionRows: RegionRow[]
}

interface Entry {
  code: string
  name: string
  region: string | null
  value: number
}

const rankIn = (entries: Entry[], value: number) => 1 + entries.filter((e) => e.value > value).length

export function municipalityStanding(
  features: readonly FeatureLike[],
  code: string | number,
  field: string,
  regionLimit = 5,
): Standing | null {
  const target = String(code)
  const uf = target.slice(0, 2)
  const state: Entry[] = []
  for (const f of features) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const c = String(p.ibge_code ?? '')
    const v = p[field]
    if (c.slice(0, 2) !== uf || typeof v !== 'number' || !Number.isFinite(v)) continue
    state.push({
      code: c,
      name: String(p.name ?? c),
      region: typeof p.immediate_region === 'string' && p.immediate_region ? p.immediate_region : null,
      value: v,
    })
  }
  const self = state.find((e) => e.code === target)
  if (!self) return null

  const sorted = [...state].sort((a, b) => b.value - a.value)
  const curve = sorted.map((e) => e.value)
  const stateTotal = curve.reduce((sum, v) => sum + v, 0)
  const mid = Math.floor(curve.length / 2)
  const median = curve.length % 2 ? curve[mid] : (curve[mid - 1] + curve[mid]) / 2

  const peers = self.region ? sorted.filter((e) => e.region === self.region) : [self]
  const rows = peers.map((e) => ({
    code: e.code,
    name: e.name,
    value: e.value,
    rank: rankIn(peers, e.value),
    self: e.code === target,
  }))
  let regionRows = rows.slice(0, regionLimit)
  if (!regionRows.some((r) => r.self)) {
    regionRows = [...rows.slice(0, regionLimit - 1), rows.find((r) => r.self)!]
  }

  return {
    value: self.value,
    stateRank: rankIn(state, self.value),
    stateCount: state.length,
    stateTotal,
    share: stateTotal > 0 ? self.value / stateTotal : 0,
    median,
    leader: { name: sorted[0].name, value: sorted[0].value },
    curve,
    region: self.region,
    regionRank: rankIn(peers, self.value),
    regionCount: peers.length,
    regionRows,
  }
}

/**
 * Height of `value` on a square-root scale, 0 at the top of a `height` box.
 * With no scale (every municipality at zero) everything sits on the baseline.
 */
export const sqrtY = (value: number, max: number, height: number) =>
  max > 0 ? height - Math.sqrt(Math.max(0, Math.min(value, max)) / max) * height : height

/**
 * An SVG area path for values sorted largest first, `width` × `height`, on a
 * square-root scale up to `max`, so the many small municipalities stay visible
 * next to the few large ones. Long curves are thinned to about `maxPoints`.
 */
export function curvePath(values: readonly number[], max: number, width: number, height: number, maxPoints = 160): string {
  if (values.length === 0 || max <= 0) return ''
  const last = values.length - 1
  const step = Math.max(1, Math.ceil(values.length / maxPoints))
  const indexes: number[] = []
  for (let i = 0; i <= last; i += step) indexes.push(i)
  if (indexes[indexes.length - 1] !== last) indexes.push(last)
  const round = (n: number) => Math.round(n * 10) / 10
  const points = indexes.map((i) => {
    const x = last === 0 ? 0 : (i / last) * width
    return `L${round(x)},${round(sqrtY(values[i], max, height))}`
  })
  return `M0,${height} ${points.join(' ')} L${width},${height} Z`
}
