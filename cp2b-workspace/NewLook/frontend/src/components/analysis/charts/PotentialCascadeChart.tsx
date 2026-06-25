'use client'

/**
 * PotentialCascadeChart - Waterfall chart showing biomass potential reduction
 * Displays: Theoretical -> After FC -> After FCp -> After FS -> Final FDE
 */

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import { TrendingDown, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  CorrectionFactors,
  calculateFDE,
  DEFAULT_FACTORS
} from '@/types/analysis'

interface CascadeDataPoint {
  name: string
  value: number
  fill: string
  isLoss: boolean
  percentage: number
  description: string
}

interface PotentialCascadeChartProps {
  theoreticalPotential: number // Total theoretical potential in tons/year
  factors?: CorrectionFactors
  title?: string
  loading?: boolean
  showLegend?: boolean
}

export default function PotentialCascadeChart({
  theoreticalPotential,
  factors = DEFAULT_FACTORS,
  title,
  loading = false,
  showLegend = true
}: PotentialCascadeChartProps) {
  const t = useTranslations('charts')

  // Calculate cascade values
  const cascadeData = useMemo((): CascadeDataPoint[] => {
    if (theoreticalPotential <= 0) return []

    const afterFC = theoreticalPotential * factors.fc
    const afterFCp = afterFC * (1 - factors.fcp)
    const afterFS = afterFCp * factors.fs
    const finalFDE = afterFS * factors.fl
    const fdePercent = calculateFDE(factors) * 100

    return [
      {
        name: t('sankey_node_theoretical'),
        value: theoreticalPotential,
        fill: '#FFD700',
        isLoss: false,
        percentage: 100,
        description: t('sankey_node_theoretical')
      },
      {
        name: t('sankey_node_collection_loss'),
        value: -(theoreticalPotential - afterFC),
        fill: '#DC143C',
        isLoss: true,
        percentage: -((1 - factors.fc) * 100),
        description: `FC=${(factors.fc * 100).toFixed(0)}%`
      },
      {
        name: t('sankey_node_collected'),
        value: afterFC,
        fill: '#FFA500',
        isLoss: false,
        percentage: (afterFC / theoreticalPotential) * 100,
        description: t('sankey_node_collected')
      },
      {
        name: t('sankey_node_competition'),
        value: -(afterFC - afterFCp),
        fill: '#DC143C',
        isLoss: true,
        percentage: -(factors.fcp * factors.fc * 100),
        description: `FCp=${(factors.fcp * 100).toFixed(0)}%`
      },
      {
        name: t('sankey_node_available'),
        value: afterFCp,
        fill: '#228B22',
        isLoss: false,
        percentage: (afterFCp / theoreticalPotential) * 100,
        description: t('sankey_node_available')
      },
      {
        name: t('sankey_node_seasonal_loss'),
        value: -(afterFCp - afterFS),
        fill: '#DC143C',
        isLoss: true,
        percentage: -((1 - factors.fs) * (afterFCp / theoreticalPotential) * 100),
        description: `FS=${(factors.fs * 100).toFixed(0)}%`
      },
      {
        name: t('sankey_node_adjusted'),
        value: afterFS,
        fill: '#32CD32',
        isLoss: false,
        percentage: (afterFS / theoreticalPotential) * 100,
        description: t('sankey_node_adjusted')
      },
      {
        name: t('sankey_node_logistics_loss'),
        value: -(afterFS - finalFDE),
        fill: '#DC143C',
        isLoss: true,
        percentage: -((1 - factors.fl) * (afterFS / theoreticalPotential) * 100),
        description: `FL=${(factors.fl * 100).toFixed(0)}%`
      },
      {
        name: t('sankey_node_biogas'),
        value: finalFDE,
        fill: '#006400',
        isLoss: false,
        percentage: fdePercent,
        description: `${fdePercent.toFixed(1)}%`
      }
    ]
  }, [theoreticalPotential, factors, t])

  // Filter to show only cumulative values (not losses) for cleaner waterfall
  const chartData = useMemo(() => {
    return cascadeData.filter(d => !d.isLoss)
  }, [cascadeData])

  // Format numbers for display
  const formatValue = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}k`
    return value.toFixed(0)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CascadeDataPoint }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
          <p className="text-sm text-gray-600 mb-2">{data.description}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-gray-500">{t('cascade_tooltip_value')}</span>{' '}
              <span className="font-mono font-semibold">{formatValue(data.value)} {t('unit_m3_yr')}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-500">{t('cascade_tooltip_percent')}</span>{' '}
              <span className="font-mono font-semibold">{data.percentage.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('cascade_title')}</h3>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cp2b-primary mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (theoreticalPotential <= 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('cascade_title')}</h3>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">{t('no_data')}</p>
            <p className="text-sm">{t('select_category_cascade')}</p>
          </div>
        </div>
      </div>
    )
  }

  const fdeValue = calculateFDE(factors)
  const finalValue = theoreticalPotential * fdeValue

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title ?? t('cascade_title')}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{t('cascade_fde_label')}</span>
            <span className="font-mono font-bold text-green-600">{(fdeValue * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{t('cascade_final_label')}</span>
            <span className="font-mono font-bold text-gray-900">{formatValue(finalValue)} {t('unit_m3_yr')}</span>
          </div>
        </div>
      </div>

      <div className="h-[400px]" role="img" aria-label={title ?? t('cascade_title')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {showLegend && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-400"></div>
              <span className="text-gray-600">{t('sankey_node_theoretical')} (100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-gray-600">{t('sankey_node_collected')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-600"></div>
              <span className="text-gray-600">{t('sankey_node_available')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-800"></div>
              <span className="text-gray-600">{t('sankey_node_biogas')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Factor Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('cascade_factors_heading')}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">FC</span>
            <span className="font-mono font-semibold text-gray-900">{(factors.fc * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500 block">FCp</span>
            <span className="font-mono font-semibold text-gray-900">{(factors.fcp * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500 block">FS</span>
            <span className="font-mono font-semibold text-gray-900">{(factors.fs * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500 block">FL</span>
            <span className="font-mono font-semibold text-gray-900">{(factors.fl * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
