'use client'

import React, { useMemo } from 'react'
import { GitBranch, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  CorrectionFactors,
  calculateFDE,
  DEFAULT_FACTORS,
  CH4_FRACTION
} from '@/types/analysis'

// Exported so page.tsx can use it to assign residue colors
export const RESIDUE_PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#06B6D4', '#A78BFA', '#FB923C',
]

export interface ResidueStream {
  name: string
  code: string
  theoretical: number
  factors: CorrectionFactors
  color: string
}

interface BiomassFlowSankeyProps {
  theoreticalPotential: number
  factors?: CorrectionFactors
  ch4Fraction?: number
  title?: string
  loading?: boolean
  residues?: ResidueStream[]   // when ≥2, activates multi-residue mode
}

interface SankeyFlow {
  theoretical: number
  losses: [number, number, number, number]
  availableBiogas: number
}

// ─── Segment definitions (loss colors are always the same regardless of residue) ──

const SEGS_META = [
  { key: 'sankey_node_collection_loss', color: '#EF4444', isLoss: true  },
  { key: 'sankey_node_competition',     color: '#F97316', isLoss: true  },
  { key: 'sankey_node_seasonal_loss',   color: '#EAB308', isLoss: true  },
  { key: 'sankey_node_logistics_loss',  color: '#B45309', isLoss: true  },
  { key: 'sankey_node_biogas',          color: '#16A34A', isLoss: false },
] as const

// ─── SVG helpers ───────────────────────────────────────────────────────────────

/**
 * Cubic-bezier S-curve band. Control points at 65% of the horizontal gap
 * produce a more pronounced S — curves stay near their endpoints longer
 * before the elegant crossing-over transition.
 */
function bandPath(
  x1: number, top1: number, bot1: number,
  x2: number, top2: number, bot2: number
): string {
  const span = x2 - x1
  const cx1  = x1 + span * 0.65
  const cx2  = x2 - span * 0.65
  return [
    `M ${x1},${top1}`,
    `C ${cx1},${top1} ${cx2},${top2} ${x2},${top2}`,
    `L ${x2},${bot2}`,
    `C ${cx2},${bot2} ${cx1},${bot1} ${x1},${bot1}`,
    'Z',
  ].join(' ')
}

function formatValue(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}k`
  return v.toFixed(0)
}

function computeFlow(theoretical: number, factors: CorrectionFactors): SankeyFlow {
  const afterCollection  = theoretical * factors.fc
  const collectionLoss   = theoretical - afterCollection
  const afterCompetition = afterCollection * (1 - factors.fcp)
  const competitionLoss  = afterCollection - afterCompetition
  const afterSeasonal    = afterCompetition * factors.fs
  const seasonalLoss     = afterCompetition - afterSeasonal
  const availableBiogas  = afterSeasonal * factors.fl
  const logisticsLoss    = afterSeasonal - availableBiogas
  return {
    theoretical,
    losses:         [collectionLoss, competitionLoss, seasonalLoss, logisticsLoss],
    availableBiogas,
  }
}

// ─── Gradient defs shared by both ClassicSankey and MultiResiduesSankey ───────

function GradientDefs({ id }: { id: string }) {
  return (
    <defs>
      {SEGS_META.map((seg, i) => (
        <linearGradient key={i} id={`${id}-g${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={seg.color} stopOpacity={0.42} />
          <stop offset="100%" stopColor={seg.color} stopOpacity={0.10} />
        </linearGradient>
      ))}
    </defs>
  )
}

// ─── Classic 2-column Sankey (single flow) ────────────────────────────────────

function ClassicSankey({
  flow,
  leftColor = '#F59E0B',
  gradId = 'cs',
  t,
  leftLabel,
}: {
  flow: SankeyFlow
  leftColor?: string
  gradId?: string
  t: (key: string, values?: Record<string, string | number>) => string
  leftLabel?: string
}) {
  const { theoretical, losses, availableBiogas } = flow

  const SVG_W   = 700
  const TOP_PAD = 44
  const BOT_PAD = 28
  const LEFT_X  = 40
  const RIGHT_X = 390
  const BAR_W   = 52
  const LABEL_X = RIGHT_X + BAR_W + 14
  const SEG_GAP = 10
  const MIN_H   = 46
  const TARGET  = 700

  const values = [...losses, availableBiogas]

  const segH = values.map(v => Math.max((v / theoretical) * TARGET, MIN_H))
  const rightColH = segH.reduce((a, b) => a + b, 0) + (values.length - 1) * SEG_GAP
  const leftBarH  = rightColH
  const svgHeight = TOP_PAD + rightColH + BOT_PAD

  let rAcc = TOP_PAD
  const rightY = segH.map(h => { const y = rAcc; rAcc += h + SEG_GAP; return y })

  let lAcc = TOP_PAD
  const leftSlices = values.map(v => {
    const h = (v / theoretical) * leftBarH
    const y = lAcc; lAcc += h
    return { y, h }
  })

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgHeight}`}
      width="100%"
      style={{ height: 'auto', minHeight: 500 }}
      className="overflow-visible"
      aria-label="Biomass flow Sankey diagram"
    >
      <GradientDefs id={gradId} />

      {/* S-curve bands — behind bars */}
      {SEGS_META.map((seg, i) => (
        <path
          key={`band-${i}`}
          d={bandPath(
            LEFT_X + BAR_W, leftSlices[i].y, leftSlices[i].y + leftSlices[i].h,
            RIGHT_X,        rightY[i],        rightY[i] + segH[i]
          )}
          fill={`url(#${gradId}-g${i})`}
          stroke={seg.color}
          strokeWidth={0.6}
          strokeOpacity={0.35}
        />
      ))}

      {/* Left input bar */}
      <rect
        x={LEFT_X} y={TOP_PAD} width={BAR_W} height={leftBarH}
        fill={leftColor} fillOpacity={0.90} rx={5} ry={5}
      />

      {/* Right segment bars */}
      {SEGS_META.map((seg, i) => (
        <g key={`bar-${i}`}>
          <rect
            x={RIGHT_X} y={rightY[i]} width={BAR_W} height={segH[i]}
            fill={seg.color} fillOpacity={0.85} rx={3} ry={3}
          />
          {/* Color accent line at top of each bar */}
          <rect
            x={RIGHT_X} y={rightY[i]} width={BAR_W} height={3}
            fill={seg.color} fillOpacity={1} rx={3} ry={3}
          />
        </g>
      ))}

      {/* Segment labels */}
      {SEGS_META.map((seg, i) => {
        const midY = rightY[i] + segH[i] / 2
        const pct  = ((values[i] / theoretical) * 100).toFixed(1)
        return (
          <g key={`lbl-${i}`}>
            <text
              x={LABEL_X} y={midY - 7}
              dominantBaseline="middle"
              fontSize={11} fontWeight={600}
              fill={seg.isLoss ? '#7F1D1D' : '#14532D'}
            >
              {t(seg.key)}
            </text>
            <text
              x={LABEL_X} y={midY + 8}
              dominantBaseline="middle"
              fontSize={10} fontFamily="monospace"
              fill="#6B7280"
            >
              {formatValue(values[i])} ({pct}%)
            </text>
          </g>
        )
      })}

      {/* Left bar labels */}
      <text
        x={LEFT_X + BAR_W / 2} y={TOP_PAD - 18}
        textAnchor="middle" fontSize={11} fontWeight={700} fill="#92400E"
      >
        {leftLabel ?? t('sankey_node_theoretical')}
      </text>
      <text
        x={LEFT_X + BAR_W / 2} y={TOP_PAD - 5}
        textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#6B7280"
      >
        {formatValue(theoretical)}
      </text>
      <text
        x={LEFT_X + BAR_W / 2} y={TOP_PAD + leftBarH + 16}
        textAnchor="middle" fontSize={9} fill="#9CA3AF"
      >
        {t('sankey_unit')}
      </text>
    </svg>
  )
}

// ─── Multi-residue Sankey ──────────────────────────────────────────────────────

function MultiResiduesSankey({
  residues,
  t,
}: {
  residues: ResidueStream[]
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const SVG_W        = 700
  const TOP_PAD      = 20
  const BOT_PAD      = 28
  const LEFT_X       = 40
  const RIGHT_X      = 390
  const BAR_W        = 52
  const LABEL_X      = RIGHT_X + BAR_W + 14
  const SEG_GAP      = 8
  const GROUP_GAP    = 28
  const MIN_GROUP_H  = 180
  const MIN_SEG_H    = 18   // compact — labels only if seg >= 28px
  const TARGET_TOTAL = 700

  const totalTheoretical = residues.reduce((s, r) => s + r.theoretical, 0)

  // Compute each residue's group height
  const groupH = residues.map(r =>
    Math.max((r.theoretical / totalTheoretical) * TARGET_TOTAL, MIN_GROUP_H)
  )

  // Group top Y positions
  const groupTop: number[] = []
  let gAcc = TOP_PAD
  residues.forEach((_, i) => {
    groupTop.push(gAcc)
    gAcc += groupH[i] + GROUP_GAP
  })

  const svgHeight = gAcc - GROUP_GAP + BOT_PAD

  // Pre-compute flows and layout per group
  const groups = residues.map((res, gi) => {
    const flow   = computeFlow(res.theoretical, res.factors)
    const values = [...flow.losses, flow.availableBiogas]
    const gh     = groupH[gi]
    const gt     = groupTop[gi]

    const segH = values.map(v => Math.max((v / res.theoretical) * gh, MIN_SEG_H))
    // If total exceeds group height, scale down proportionally
    const totalSegH = segH.reduce((a, b) => a + b, 0) + (values.length - 1) * SEG_GAP
    const scale = totalSegH > gh ? gh / totalSegH : 1
    const scaledH = segH.map(h => h * scale)

    let rAcc = gt
    const rightY = scaledH.map(h => { const y = rAcc; rAcc += h + SEG_GAP * scale; return y })

    let lAcc = gt
    const leftSlices = values.map(v => {
      const h = (v / res.theoretical) * gh
      const y = lAcc; lAcc += h
      return { y, h }
    })

    const fde = calculateFDE(res.factors)
    return { res, flow, values, scaledH, rightY, leftSlices, gh, gt, fde }
  })

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgHeight}`}
      width="100%"
      style={{ height: 'auto', minHeight: 400 }}
      className="overflow-visible"
      aria-label="Multi-residue biomass flow Sankey diagram"
    >
      <defs>
        {/* Per-residue gradients for left bars */}
        {residues.map((res, i) => (
          <linearGradient key={`rg${i}`} id={`rg${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={res.color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={res.color} stopOpacity={0.70} />
          </linearGradient>
        ))}
        {/* Shared per-segment band gradients */}
        {SEGS_META.map((seg, i) => (
          <linearGradient key={`sg${i}`} id={`sg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={seg.color} stopOpacity={0.38} />
            <stop offset="100%" stopColor={seg.color} stopOpacity={0.10} />
          </linearGradient>
        ))}
      </defs>

      {groups.map(({ res, values, scaledH, rightY, leftSlices, gh, gt, fde }, gi) => (
        <g key={res.code}>
          {/* Group divider line (not for first group) */}
          {gi > 0 && (
            <line
              x1={LEFT_X} y1={gt - GROUP_GAP / 2}
              x2={SVG_W - 10} y2={gt - GROUP_GAP / 2}
              stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4 3"
            />
          )}

          {/* S-curve bands */}
          {SEGS_META.map((seg, i) => (
            <path
              key={`band-${gi}-${i}`}
              d={bandPath(
                LEFT_X + BAR_W, leftSlices[i].y, leftSlices[i].y + leftSlices[i].h,
                RIGHT_X,        rightY[i],        rightY[i] + scaledH[i]
              )}
              fill={`url(#sg${i})`}
              stroke={seg.color}
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          ))}

          {/* Left residue bar */}
          <rect
            x={LEFT_X} y={gt} width={BAR_W} height={gh}
            fill={`url(#rg${gi})`} rx={5} ry={5}
          />
          {/* Residue color accent at top */}
          <rect
            x={LEFT_X} y={gt} width={BAR_W} height={4}
            fill={res.color} fillOpacity={1} rx={5} ry={5}
          />

          {/* Right segment bars */}
          {SEGS_META.map((seg, i) => (
            <g key={`bar-${gi}-${i}`}>
              <rect
                x={RIGHT_X} y={rightY[i]} width={BAR_W} height={scaledH[i]}
                fill={seg.color} fillOpacity={0.82} rx={2} ry={2}
              />
              <rect
                x={RIGHT_X} y={rightY[i]} width={BAR_W} height={2}
                fill={seg.color} fillOpacity={1} rx={2} ry={2}
              />
            </g>
          ))}

          {/* Segment labels (only when tall enough) */}
          {SEGS_META.map((seg, i) => {
            if (scaledH[i] < 28) return null
            const midY = rightY[i] + scaledH[i] / 2
            const pct  = ((values[i] / res.theoretical) * 100).toFixed(1)
            return (
              <g key={`lbl-${gi}-${i}`}>
                <text
                  x={LABEL_X} y={midY - 5}
                  dominantBaseline="middle"
                  fontSize={10} fontWeight={600}
                  fill={seg.isLoss ? '#7F1D1D' : '#14532D'}
                >
                  {t(seg.key)}
                </text>
                <text
                  x={LABEL_X} y={midY + 7}
                  dominantBaseline="middle"
                  fontSize={9} fontFamily="monospace"
                  fill="#6B7280"
                >
                  {formatValue(values[i])} ({pct}%)
                </text>
              </g>
            )
          })}

          {/* Left bar: residue name + potential */}
          <text
            x={LEFT_X + BAR_W / 2} y={gt - 14}
            textAnchor="middle" fontSize={11} fontWeight={700}
            fill={res.color}
          >
            {res.name}
          </text>
          <text
            x={LEFT_X + BAR_W / 2} y={gt - 2}
            textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#6B7280"
          >
            {formatValue(res.theoretical)} m³/ano
          </text>

          {/* Right summary label (center-right of the group) */}
          {gh >= 60 && (
            <text
              x={LABEL_X} y={gt + gh / 2}
              dominantBaseline="middle"
              fontSize={10} fontWeight={600}
              fill="#15803D"
            >
              FDE {(fde * 100).toFixed(1)}% → {formatValue(res.theoretical * fde)} m³/ano
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// ─── Exported wrapper ──────────────────────────────────────────────────────────

export default function BiomassFlowSankey({
  theoreticalPotential,
  factors = DEFAULT_FACTORS,
  ch4Fraction = CH4_FRACTION,
  title,
  loading = false,
  residues,
}: BiomassFlowSankeyProps) {
  const t = useTranslations('charts')

  const flow = useMemo((): SankeyFlow | null => {
    if (theoreticalPotential <= 0) return null
    return computeFlow(theoreticalPotential, factors)
  }, [theoreticalPotential, factors])

  const isMulti = (residues?.length ?? 0) >= 2

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('sankey_title')}</h3>
        </div>
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cp2b-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t('sankey_loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isMulti && !flow) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('sankey_title')}</h3>
        </div>
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">{t('sankey_no_data')}</p>
            <p className="text-sm">{t('sankey_select_category')}</p>
          </div>
        </div>
      </div>
    )
  }

  const fdeValue        = calculateFDE(factors)
  const availableBiogas = theoreticalPotential * fdeValue
  const ch4Equivalent   = availableBiogas * ch4Fraction
  const totalLosses     = theoreticalPotential - availableBiogas

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('sankey_title')}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{t('sankey_node_biogas')}:</span>
            <span className="font-mono font-bold text-green-600">{formatValue(availableBiogas)} {t('unit_m3_yr')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{t('sankey_ch4_label')}:</span>
            <span className="font-mono font-bold text-blue-600">{formatValue(ch4Equivalent)} {t('unit_m3_yr')}</span>
          </div>
        </div>
      </div>

      {/* SVG — switches between modes */}
      <div className="overflow-visible pt-2">
        {isMulti
          ? <MultiResiduesSankey residues={residues!} t={t} />
          : <ClassicSankey flow={flow!} t={t} />
        }
      </div>

      {/* Summary Cards */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{t('sankey_summary_input')}</div>
            <div className="font-mono font-semibold text-amber-700">{formatValue(theoreticalPotential)}</div>
            <div className="text-xs text-gray-400">{t('unit_m3_yr')}</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{t('sankey_summary_total_losses')}</div>
            <div className="font-mono font-semibold text-red-600">{formatValue(totalLosses)}</div>
            <div className="text-xs text-gray-400">{((totalLosses / theoreticalPotential) * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{t('sankey_summary_to_biogas')}</div>
            <div className="font-mono font-semibold text-green-700">{formatValue(availableBiogas)}</div>
            <div className="text-xs text-gray-400">{(fdeValue * 100).toFixed(1)}% FDE</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{t('sankey_summary_ch4')}</div>
            <div className="font-mono font-semibold text-blue-700">{formatValue(ch4Equivalent)}</div>
            <div className="text-xs text-gray-400">{t('sankey_ch4_fraction', { pct: (ch4Fraction * 100).toFixed(0) })}</div>
          </div>
        </div>
      </div>

      {/* Legend + Benchmark */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('sankey_legend_title')}</h4>
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-green-600 rounded opacity-80" />
            <span className="text-gray-600">{t('sankey_legend_useful')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-red-400 rounded opacity-80" />
            <span className="text-gray-600">{t('sankey_legend_losses')}</span>
          </div>
        </div>
        <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">{t('sankey_benchmark_label')}</p>
        </div>
      </div>
    </div>
  )
}
