'use client'

/**
 * Region Markers Layer for Economic Simulation
 * Displays 133 Brazil intermediary regions as clickable markers
 */
import { useEffect, useState } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { logger } from '@/lib/logger'

interface Region {
  cd_rgint: string
  nm_rgint: string
  sigla_uf: string
  vab_total_brl: number
  population: number
  centroid_lat: number | null
  centroid_lng: number | null
}

interface RegionMarkersLayerProps {
  selectedRegion: string | null
  onRegionSelect: (code: string) => void
  simulationResult?: any
}

export default function RegionMarkersLayer({
  selectedRegion,
  onRegionSelect,
  simulationResult
}: RegionMarkersLayerProps) {
  const map = useMap()
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch Brazil regions from API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${API_URL}/api/v1/simulation/regions/brazil`)

        if (!response.ok) {
          throw new Error('Failed to fetch Brazil regions')
        }

        const data = await response.json()
        setRegions(data.regions || [])
      } catch (err: any) {
        logger.error('Error fetching Brazil regions:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRegions()
  }, [])

  // Create custom marker icons
  const createMarkerIcon = (isSelected: boolean, hasImpact: boolean) => {
    const color = isSelected ? '#10b981' : hasImpact ? '#f59e0b' : '#3b82f6'
    const size = isSelected ? 16 : hasImpact ? 14 : 12

    return L.divIcon({
      className: 'custom-region-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s;
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    })
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      notation: value >= 1e9 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(value)
  }

  // Check if region has simulation impact
  const hasImpact = (regionCode: string) => {
    if (!simulationResult?.results?.regional_impacts) return false
    // regional_impacts is a Record/dict: { "3501": {...}, "3502": {...}, ... }
    return regionCode in simulationResult.results.regional_impacts
  }

  // Get impact data for region
  const getImpact = (regionCode: string) => {
    if (!simulationResult?.results?.regional_impacts) return null
    // regional_impacts is a Record/dict: { "3501": { region_name, vab_impact_brl, spillover_weight }, ... }
    return simulationResult.results.regional_impacts[regionCode]
  }

  if (loading) {
    return null // Show nothing while loading
  }

  if (error) {
    logger.error('Region markers error:', error)
    return null
  }

  return (
    <>
      {regions
        .filter((region) => {
          // Only render regions with valid coordinates
          return region.centroid_lat != null && region.centroid_lng != null
        })
        .map((region) => {
          const isSelected = selectedRegion === region.cd_rgint
          const impact = getImpact(region.cd_rgint)
          const hasRegionImpact = !!impact

          // Safe to use non-null assertion here because we filtered above
          const lat = region.centroid_lat!
          const lng = region.centroid_lng!

          return (
            <Marker
              key={region.cd_rgint}
              position={[lat, lng]}
              icon={createMarkerIcon(isSelected, hasRegionImpact)}
              eventHandlers={{
                click: () => {
                  onRegionSelect(region.cd_rgint)
                  map.setView([lat, lng], 8, {
                    animate: true,
                    duration: 0.5
                  })
                }
              }}
            >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">
                  {region.nm_rgint}
                </h3>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {region.sigla_uf}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Código:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {region.cd_rgint}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">VAB Total:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(region.vab_total_brl)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">População:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {region.population ? region.population.toLocaleString('pt-BR') : 'N/A'}
                    </span>
                  </div>

                  {impact && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
                        <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                          Impacto Simulado
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Impacto VAB:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(impact.vab_impact_brl)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Peso Spillover:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {(impact.spillover_weight * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => onRegionSelect(region.cd_rgint)}
                  className="w-full mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Selecionar Região
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
