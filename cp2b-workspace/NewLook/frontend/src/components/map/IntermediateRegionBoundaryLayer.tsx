'use client'

/**
 * PILAR-2b - Intermediate Region Boundary Layer
 * Displays the 11 São Paulo State intermediate region boundaries as dashed outlines
 * Data source: IBGE Regiões Geográficas Intermediárias (2017)
 */
import { useEffect, useState, useMemo, useCallback } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { logger } from '@/lib/logger'

interface IntermediateRegionBoundaryLayerProps {
  visible?: boolean
  color?: string
  weight?: number
  dashArray?: string
  showLabels?: boolean
}

interface RegionFeature {
  type: 'Feature'
  properties: {
    cd_rgint: string
    nm_rgint: string
    cd_uf: string
    nm_uf: string
    sigla_uf: string
    area_km2: number
    centroid_lat: number
    centroid_lng: number
  }
  geometry: GeoJSON.Geometry
}

interface RegionCollection {
  type: 'FeatureCollection'
  features: RegionFeature[]
}

const SP_UF_CODE = '35'

export default function IntermediateRegionBoundaryLayer({
  visible = true,
  color = '#1B5E20',
  weight = 2,
  dashArray = '8, 6',
  showLabels = true,
}: IntermediateRegionBoundaryLayerProps) {
  const map = useMap()
  const [geoJsonData, setGeoJsonData] = useState<RegionCollection | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch and filter GeoJSON for SP regions only
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
        const response = await fetch(`${basePath}/data/br_intermediary_regions.geojson`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()

        // Filter for São Paulo state only
        const spFeatures = data.features.filter(
          (f: RegionFeature) => f.properties.cd_uf === SP_UF_CODE
        )

        setGeoJsonData({
          type: 'FeatureCollection',
          features: spFeatures,
        })
      } catch (err) {
        logger.error('Failed to load intermediate region boundaries:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRegions()
  }, [])

  // Add region name labels at centroids
  useEffect(() => {
    if (!showLabels || !geoJsonData || !visible) return

    const labels: L.Marker[] = []

    geoJsonData.features.forEach((feature) => {
      const { nm_rgint, centroid_lat, centroid_lng } = feature.properties
      if (!centroid_lat || !centroid_lng) return

      const label = L.marker([centroid_lat, centroid_lng], {
        icon: L.divIcon({
          className: 'intermediate-region-label',
          html: `<span style="
            font-size: 11px;
            font-weight: 600;
            color: ${color};
            text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;
            white-space: nowrap;
            pointer-events: none;
          ">${nm_rgint}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      })

      label.addTo(map)
      labels.push(label)
    })

    return () => {
      labels.forEach((l) => map.removeLayer(l))
    }
  }, [geoJsonData, showLabels, visible, map, color])

  // Style for boundary-only rendering (no fill)
  const style = useCallback(
    () => ({
      color,
      weight,
      dashArray,
      fillOpacity: 0,
      opacity: 0.8,
    }),
    [color, weight, dashArray]
  )

  // Tooltip on hover showing region name
  const onEachFeature = useCallback(
    (feature: RegionFeature, layer: L.Layer) => {
      const { nm_rgint, area_km2 } = feature.properties
      const formattedArea = area_km2
        ? `${area_km2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km²`
        : ''

      ;(layer as L.Path).bindTooltip(
        `<strong>${nm_rgint}</strong>${formattedArea ? `<br/>${formattedArea}` : ''}`,
        {
          sticky: true,
          direction: 'top',
          offset: [0, -10],
        }
      )
    },
    []
  )

  // Stable key to prevent GeoJSON re-renders
  const geoJsonKey = useMemo(
    () => (geoJsonData ? `sp-regions-${geoJsonData.features.length}` : 'loading'),
    [geoJsonData]
  )

  if (loading || !geoJsonData || !visible) return null

  return (
    <GeoJSON
      key={geoJsonKey}
      data={geoJsonData as GeoJSON.FeatureCollection}
      style={style}
      onEachFeature={onEachFeature as (feature: GeoJSON.Feature, layer: L.Layer) => void}
    />
  )
}
