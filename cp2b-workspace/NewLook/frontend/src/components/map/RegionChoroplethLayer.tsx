'use client'

/**
 * Region Choropleth Layer for Economic Simulation
 * Displays 133 Brazil intermediary regions as colored polygons based on economic impact
 */
import { useEffect, useState } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { logger } from '@/lib/logger'

interface RegionChoroplethLayerProps {
  selectedRegion: string | null
  simulationResult?: any
  onRegionClick?: (regionCode: string) => void
}

export default function RegionChoroplethLayer({
  selectedRegion,
  simulationResult,
  onRegionClick
}: RegionChoroplethLayerProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  const [regionCodeMap, setRegionCodeMap] = useState<Record<string, string>>({}) // name -> code mapping
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch both shapefile and region codes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

        // Fetch Brazil GeoJSON from public directory and regions from API
        const [shapefileResponse, regionsResponse] = await Promise.all([
          fetch('/data/br_intermediary_regions.geojson'),
          fetch(`${API_URL}/api/v1/simulation/regions/brazil`)
        ])

        if (!shapefileResponse.ok || !regionsResponse.ok) {
          throw new Error('Failed to fetch region data')
        }

        const shapefileData = await shapefileResponse.json()
        const regionsData = await regionsResponse.json()

        // Create name -> code mapping from database (for Brazil intermediary regions)
        const nameToCode: Record<string, string> = {}
        regionsData.regions.forEach((region: any) => {
          // API returns cd_rgi and nm_rgi (transformed from database)
          nameToCode[region.nm_rgi] = region.cd_rgi
        })

        setGeoJsonData(shapefileData)
        setRegionCodeMap(nameToCode)
      } catch (err: any) {
        logger.error('Error fetching region data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Normalize shapefile code to 4-digit format (fallback strategy)
  const normalizeShapefileCode = (rawCode: string | undefined): string | null => {
    if (!rawCode) return null

    const codeStr = rawCode.toString()

    // Handle different formats
    if (codeStr.length === 6) {
      // 6-digit: '350047' -> extract state (35) + parse region number (47) -> '3547'
      const state = codeStr.substring(0, 2)
      const regionNum = parseInt(codeStr.substring(2), 10)
      return state + regionNum.toString().padStart(2, '0')
    } else if (codeStr.length === 5) {
      // 5-digit: '35047' -> extract state (35) + parse region (047 = 47) -> '3547'
      const state = codeStr.substring(0, 2)
      const regionNum = parseInt(codeStr.substring(2), 10)
      return state + regionNum.toString().padStart(2, '0')
    } else if (codeStr.length === 4) {
      // Already correct format
      return codeStr
    }

    return null
  }

  // Get region code from shapefile feature using name mapping with fallback
  const getRegionCode = (feature: any): string | null => {
    // For Brazil intermediary regions, use cd_rgint property
    const regionCode = feature.properties?.cd_rgint || feature.properties?.CD_RGINT
    const regionName = feature.properties?.nm_rgint || feature.properties?.NM_RGINT

    // Strategy 1: Use direct code from GeoJSON properties
    if (regionCode) {
      return String(regionCode)
    }

    // Strategy 2: Try exact name match with database
    if (regionName && regionCodeMap[regionName]) {
      return regionCodeMap[regionName]
    }

    logger.warn(`No code found for region: ${regionName}`)
    return null
  }

  // Get impact data for a region
  const getRegionImpact = (regionCode: string | null) => {
    if (!regionCode || !simulationResult?.results?.regional_impacts) return null
    return simulationResult.results.regional_impacts[regionCode]
  }

  // Get color based on impact intensity - Graduated choropleth like Prototipo
  const getColor = (regionCode: string | null) => {
    if (!regionCode) return '#e5e7eb' // Gray if no code

    const impact = getRegionImpact(regionCode)

    if (!impact) {
      // No impact - light gray/transparent (or emerald if selected)
      return selectedRegion === regionCode ? '#10b981' : '#e5e7eb'
    }

    // Handle NaN or undefined spillover_weight
    const spilloverWeight = impact.spillover_weight
    if (spilloverWeight === undefined || isNaN(spilloverWeight)) {
      return '#e5e7eb' // Gray if invalid data
    }

    // Color scale based on spillover weight (0-100%) - RED GRADIENT
    // ADJUSTED THRESHOLDS for 133 Brazil regions (values match actual data, display shows 100x boost)
    const weight = spilloverWeight * 100

    // Realistic color scale adjusted to actual spillover distribution
    // (Display shows 100x boost, so 0.1% actual = 10% displayed)
    if (weight >= 0.1) return '#8B0000'   // Dark red - Top tier impact (≥0.1% = displays as ≥10%)
    if (weight >= 0.05) return '#DC143C'  // Crimson - Very high impact (0.05-0.1% = 5-10% display)
    if (weight >= 0.02) return '#FF6347'  // Tomato - High impact (0.02-0.05% = 2-5% display)
    if (weight >= 0.01) return '#FFA07A'  // Light salmon - Medium impact (0.01-0.02% = 1-2% display)
    if (weight >= 0.005) return '#FFB6C1' // Light pink - Low impact (0.005-0.01% = 0.5-1% display)
    if (weight >= 0.001) return '#FFC0CB' // Pink - Very low impact (0.001-0.005% = 0.1-0.5% display)
    return '#FFF0F5'                      // Lavender blush - Negligible impact (<0.001% = <0.1% display)
  }

  // Style function for GeoJSON features
  const style = (feature: any) => {
    const regionCode = getRegionCode(feature)
    const isSelected = selectedRegion === regionCode
    const hasImpact = !!getRegionImpact(regionCode)

    return {
      fillColor: getColor(regionCode),
      // IMPROVED VISIBILITY: Higher opacity and clearer borders
      fillOpacity: hasImpact ? 0.85 : 0.2,  // Reduced default opacity for clearer borders
      color: isSelected ? '#059669' : (hasImpact ? '#065f46' : '#1e293b'), // Much darker borders (slate-900)
      weight: isSelected ? 3 : (hasImpact ? 2.5 : 1.5),  // Thicker borders for better visibility
      opacity: 1,  // Full opacity for borders
      dashArray: '0'  // Solid lines for all regions (no dashed lines)
    }
  }

  // Handle feature interaction
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const regionCode = getRegionCode(feature)
    const regionName = feature.properties?.nm_rgint || feature.properties?.NM_RGINT || 'Unknown Region'
    const stateName = feature.properties?.sigla_uf || feature.properties?.SIGLA_UF || ''

    if (!regionCode) {
      logger.warn('Region code not found for:', regionName, 'Properties:', feature.properties)
      return
    }

    // Popup content with simulation impact (if available)
    const impact = getRegionImpact(regionCode)
    let popupContent = `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold;">${regionName}</h3>
        <div style="font-size: 12px; color: #6b7280;">
          <strong>Estado:</strong> ${stateName}<br/>
          <strong>Código:</strong> ${regionCode}
        </div>
    `

    if (impact) {
      // Handle NaN and invalid data
      const spilloverWeight = impact.spillover_weight
      const vabImpact = impact.vab_impact_brl

      if (spilloverWeight !== undefined && !isNaN(spilloverWeight) && vabImpact !== undefined && !isNaN(vabImpact)) {
        // Apply 100x display boost for better visualization
        const weightPercent = (spilloverWeight * 100 * 100).toFixed(2)
        const vabImpactM = (vabImpact / 1e6).toFixed(2)
        const weightNum = parseFloat(weightPercent)

        // Determine background color based on impact level (with 100x boost applied)
        const bgColor = weightNum >= 30 ? '#dcfce7' :
                       weightNum >= 10 ? '#d1fae5' :
                       weightNum >= 2 ? '#ecfdf5' : '#f0fdf4'

        const emoji = weightNum >= 30 ? '🔥' :
                     weightNum >= 10 ? '📈' :
                     weightNum >= 2 ? '📊' : '📉'

        popupContent += `
          <div style="margin-top: 8px; padding: 8px; background: ${bgColor}; border-radius: 4px; border: 2px solid #059669;">
            <div style="font-size: 11px; font-weight: 600; color: #065f46; margin-bottom: 4px;">
              💰 Spillover de Leontief
            </div>
            <div style="font-size: 13px; color: #047857; margin-bottom: 4px;">
              <strong>Impacto VAB:</strong> R$ ${vabImpactM}M
            </div>
            <div style="font-size: 13px; color: #047857; margin-bottom: 4px;">
              <strong>Peso Spillover:</strong> ${weightPercent}%
              <span style="font-size: 10px; color: #6b7280; font-weight: normal;"> (×100)</span>
            </div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600;">
              ${emoji} ${weightNum >= 30 ? 'Alto impacto (região próxima)' :
                  weightNum >= 10 ? 'Médio impacto' :
                  weightNum >= 2 ? 'Baixo impacto' : 'Impacto mínimo (região distante)'}
            </div>
        `

        // Add top 3 affected sectors for this region
        if (impact.top_sectors && impact.top_sectors.length > 0) {
          popupContent += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #059669;">
              <div style="font-size: 11px; font-weight: 600; color: #065f46; margin-bottom: 4px;">
                🏭 Top 3 Setores Afetados:
              </div>
          `

          impact.top_sectors.slice(0, 3).forEach((sector: any, idx: number) => {
            const sectorImpactM = (sector.production_brl / 1e6).toFixed(2)
            popupContent += `
              <div style="font-size: 11px; color: #047857; margin-bottom: 2px; padding-left: 8px;">
                ${idx + 1}. ${sector.sector_name.substring(0, 35)}${sector.sector_name.length > 35 ? '...' : ''}
                <div style="font-size: 10px; color: #6b7280; padding-left: 12px;">
                  R$ ${sectorImpactM}M
                </div>
              </div>
            `
          })

          popupContent += `</div>`
        }

        popupContent += `</div>
        `
      } else {
        // Invalid data - show debug info
        popupContent += `
          <div style="margin-top: 8px; padding: 8px; background: #fee2e2; border-radius: 4px;">
            <div style="font-size: 11px; font-weight: 600; color: #991b1b; margin-bottom: 4px;">
              ⚠️ Dados Inválidos
            </div>
            <div style="font-size: 10px; color: #7f1d1d;">
              spillover_weight: ${spilloverWeight}<br/>
              vab_impact_brl: ${vabImpact}
            </div>
          </div>
        `
      }
    }

    popupContent += `</div>`

    layer.bindPopup(popupContent)

    // Hover effects
    layer.on({
      mouseover: (e) => {
        const layer = e.target
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.9
        })
        layer.bringToFront()
      },
      mouseout: (e) => {
        const layer = e.target
        layer.setStyle(style(feature))
      },
      click: () => {
        if (onRegionClick && regionCode) {
          onRegionClick(regionCode)
        }
      }
    })
  }

  if (loading) {
    return null // Show nothing while loading
  }

  if (error || !geoJsonData) {
    logger.error('Region choropleth error:', error)
    return null
  }

  return (
    <GeoJSON
      key={`choropleth-${selectedRegion}-${simulationResult?.simulation_id || 'initial'}`}
      data={geoJsonData}
      style={style}
      onEachFeature={onEachFeature}
    />
  )
}
