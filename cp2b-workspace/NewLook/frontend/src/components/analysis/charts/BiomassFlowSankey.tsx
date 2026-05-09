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

interface BiomassFlowSankeyProps {
  theoreticalPotential: number  // m³ biogas/year (pre-FDE)
  factors?: CorrectionFactors
  ch4Fraction?: number          // fraction of CH₄ in biogas, default 0.60
  title?: string
  loading?: boolean
}

interface FlowSegment {
  label: string
  value: number
  color: string
  isLoss: boolean
}

function formatValue(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}k`
  return value.toFixed(0)
}

// Pure SVG alluvial diagram — two columns connected by straight trapezoid bands
function AlluvialDiagram({
  theoretical,
  segments,
  t
}: {
  theoretical: number
  segments: FlowSegment[]
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  // SVG layout
  const svgWidth = 700
  const svgHeight = 460
  const barW = 56
  const leftX = 60
  const rightX = 380
  const topPad = 20
  const usableH = svgHeight - topPad * 2

  // Right column: stack segments top-to-bottom proportional to value
  const rightSegments = segments.map(seg => ({
    ...seg,
    height: Math.max((seg.value / theoretical) * usableH, 2)
  }))

  // Left bar: full usable height
  const leftBarY = topPad
  const leftBarH = usableH

  // Compute right column Y positions (stacked)
  let accY = topPad
  const rightRects = rightSegments.map(seg => {
    const y = accY
    accY += seg.height
    return { ...seg, y, h: seg.height }
  })

  // Map each right segment to its corresponding left slice
  // Left column is cut into the same proportional slices in the same order
  let leftAccY = topPad
  const leftSlices = rightSegments.map(seg => {
    const h = (seg.value / theoretical) * usableH
    const y = leftAccY
    leftAccY += h
    return { y, h }
  })

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full"
      aria-label="Biomass flow diagram"
    >
      {/* Left bar */}
      <rect
        x={leftX}
        y={leftBarY}
        width={barW}
        height={leftBarH}
        fill="#F59E0B"
        rx={4}
        ry={4}
      />

      {/* Left bar label */}
      <text
        x={leftX + barW / 2}
        y={topPad - 8}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#92400E"
      >
        {t('sankey_left_label')}
      </text>
      <text
        x={leftX + barW / 2}
        y={topPad + usableH + 16}
        textAnchor="middle"
        fontSize={10}
        fill="#6B7280"
        fontFamily="monospace"
      >
        {formatValue(theoretical)}
      </text>
      <text
        x={leftX + barW / 2}
        y={topPad + usableH + 28}
        textAnchor="middle"
        fontSize={9}
        fill="#9CA3AF"
      >
        {t('sankey_unit')}
      </text>

      {/* Trapezoid bands + right segments */}
      {rightRects.map((seg, i) => {
        const lSlice = leftSlices[i]
        const lLeft = leftX + barW
        const lTop = lSlice.y
        const lBot = lSlice.y + lSlice.h
        const rLeft = rightX
        const rTop = seg.y
        const rBot = seg.y + seg.h

        return (
          <g key={seg.label}>
            {/* Trapezoid band */}
            <polygon
              points={`${lLeft},${lTop} ${lLeft},${lBot} ${rLeft},${rBot} ${rLeft},${rTop}`}
              fill={seg.color}
              fillOpacity={seg.isLoss ? 0.18 : 0.25}
              stroke={seg.color}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />

            {/* Right segment bar */}
            <rect
              x={rightX}
              y={rTop}
              width={barW}
              height={Math.max(seg.h, 2)}
              fill={seg.color}
              fillOpacity={seg.isLoss ? 0.75 : 0.9}
              rx={3}
              ry={3}
            />

            {/* Segment label — right of bar */}
            <text
              x={rightX + barW + 10}
              y={rTop + seg.h / 2 - 5}
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={500}
              fill={seg.isLoss ? '#7F1D1D' : '#14532D'}
            >
              {seg.label}
            </text>
            <text
              x={rightX + barW + 10}
              y={rTop + seg.h / 2 + 8}
              dominantBaseline="middle"
              fontSize={10}
              fill="#6B7280"
              fontFamily="monospace"
            >
              {formatValue(seg.value)} ({((seg.value / theoretical) * 100).toFixed(1)}%)
            </text>
          </g>
        )
      })}

      {/* Right column header */}
      <text
        x={rightX + barW / 2}
        y={topPad - 8}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#374151"
      >
        {t('sankey_right_label')}
      </text>
    </svg>
  )
}

export default function BiomassFlowSankey({
  theoreticalPotential,
  factors = DEFAULT_FACTORS,
  ch4Fraction = CH4_FRACTION,
  title,
  loading = false
}: BiomassFlowSankeyProps) {
  const t = useTranslations('charts')

  const segments = useMemo((): FlowSegment[] => {
    if (theoreticalPotential <= 0) return []

    const collectionLoss = theoreticalPotential * (1 - factors.fc)
    const afterCollection = theoreticalPotential * factors.fc
    const competitionLoss = afterCollection * factors.fcp
    const afterCompetition = afterCollection * (1 - factors.fcp)
    const seasonalLoss = afterCompetition * (1 - factors.fs)
    const afterSeasonal = afterCompetition * factors.fs
    const logisticsLoss = afterSeasonal * (1 - factors.fl)
    const availableBiogas = afterSeasonal * factors.fl

    return [
      { label: t('sankey_node_collection_loss'), value: collectionLoss,   color: '#EF4444', isLoss: true  },
      { label: t('sankey_node_competition'),     value: competitionLoss,  color: '#F97316', isLoss: true  },
      { label: t('sankey_node_seasonal_loss'),   value: seasonalLoss,     color: '#F59E0B', isLoss: true  },
      { label: t('sankey_node_logistics_loss'),  value: logisticsLoss,    color: '#B45309', isLoss: true  },
      { label: t('sankey_node_biogas'),          value: availableBiogas,  color: '#16A34A', isLoss: false },
    ]
  }, [theoreticalPotential, factors, t])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('sankey_title')}</h3>
        </div>
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cp2b-primary mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">{t('sankey_loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!segments.length) {
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

  const fdeValue = calculateFDE(factors)
  const availableBiogas = theoreticalPotential * fdeValue
  const ch4Equivalent = availableBiogas * ch4Fraction
  const totalLosses = theoreticalPotential - availableBiogas

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
            <span className="font-mono font-bold text-green-600">{formatValue(availableBiogas)} m³/ano</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{t('sankey_ch4_label')}:</span>
            <span className="font-mono font-bold text-blue-600">{formatValue(ch4Equivalent)} m³/ano</span>
          </div>
        </div>
      </div>

      {/* SVG Alluvial Diagram */}
      <div className="h-[460px]">
        <AlluvialDiagram
          theoretical={theoreticalPotential}
          segments={segments}
          t={t}
        />
      </div>

      {/* Summary Cards */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">{t('sankey_summary_input')}</div>
            <div className="font-mono font-semibold text-amber-700">{formatValue(theoreticalPotential)}</div>
            <div className="text-xs text-gray-400">m³/ano</div>
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
            <div className="w-8 h-2 bg-green-600 rounded opacity-80"></div>
            <span className="text-gray-600">{t('sankey_legend_useful')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 bg-red-400 rounded opacity-80"></div>
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
