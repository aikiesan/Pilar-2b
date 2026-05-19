/**
 * Top Municipalities Mini Card - Compact display for top 5 municipalities
 * Replaces the large TopMunicipalitiesChart in cascade view for space efficiency
 */

import { ArrowRight, MapPin, TrendingUp } from 'lucide-react'

interface Municipality {
  id: number
  municipality_name: string
  biogas_m3_year: number
  administrative_region?: string
  population?: number
}

interface TopMunicipalitiesMiniCardProps {
  data: Municipality[]
  loading?: boolean
  maxItems?: number
  title?: string
  onViewAll?: () => void
}

export default function TopMunicipalitiesMiniCard({
  data,
  loading = false,
  maxItems = 5,
  title = 'Top 5 Municípios',
  onViewAll
}: TopMunicipalitiesMiniCardProps) {
  // Get top N municipalities
  const topMunicipalities = data.slice(0, maxItems)

  // Calculate max value for relative bar sizing
  const maxBiogas = topMunicipalities.length > 0
    ? Math.max(...topMunicipalities.map(m => m.biogas_m3_year))
    : 1

  // Format large numbers
  const formatValue = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}k`
    return value.toFixed(0)
  }

  // Get color for rank position
  const getRankColor = (index: number): string => {
    if (index === 0) return 'bg-yellow-400 text-yellow-900'
    if (index === 1) return 'bg-gray-300 text-gray-800'
    if (index === 2) return 'bg-orange-400 text-orange-900'
    return 'bg-green-100 text-green-700'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            {title}
          </h3>
        </div>
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (topMunicipalities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhum município encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            {title}
          </h3>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Municipality List */}
      <div className="p-5 space-y-3">
        {topMunicipalities.map((municipality, index) => {
          const percentage = (municipality.biogas_m3_year / maxBiogas) * 100

          return (
            <div key={municipality.id} className="group">
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankColor(index)}`}
                >
                  {index + 1}
                </div>

                {/* Municipality Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-green-600 transition-colors">
                      {municipality.municipality_name}
                    </h4>
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      {formatValue(municipality.biogas_m3_year)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Region */}
                  {municipality.administrative_region && (
                    <p className="text-xs text-gray-500">
                      {municipality.administrative_region}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with total count */}
      {data.length > maxItems && (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs text-gray-500">
            +{data.length - maxItems} municípios adicionais
          </p>
        </div>
      )}
    </div>
  )
}
