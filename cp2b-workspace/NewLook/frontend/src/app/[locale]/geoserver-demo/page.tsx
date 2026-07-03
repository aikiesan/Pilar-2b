/**
 * PILAR-2b — GeoServer integration demo page (ISOLATED EXAMPLE)
 * -----------------------------------------------------------------------------
 * Renders a single GeoServer WMS layer over an OSM base, to prove the
 * end-to-end integration (PostGIS → GeoServer → WMS → Leaflet). This page is
 * additive and independent of the production /map experience.
 *
 * Requires a running GeoServer with the cp2b layers published — see
 * docs/GEOSERVER_INTEGRATION.md. Configure NEXT_PUBLIC_GEOSERVER_URL to point
 * the browser at the GeoServer base URL.
 */
'use client'

import dynamic from 'next/dynamic'

// Leaflet needs the browser — load the demo map client-side only.
const GeoServerDemoMap = dynamic(
  () => import('@/components/map/examples/GeoServerDemoMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading GeoServer demo map…</p>
      </div>
    ),
  }
)

export default function GeoServerDemoPage() {
  const geoserverUrl =
    process.env.NEXT_PUBLIC_GEOSERVER_URL || 'http://localhost:8080/geoserver'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1E5128]">GeoServer WMS demo</h1>
        <p className="text-gray-600">
          Isolated example: a PostGIS layer published through GeoServer 3.0 and
          consumed as an OGC WMS layer in Leaflet. Not part of the production map.
        </p>
        <p className="text-xs text-gray-500">
          GeoServer base: <code>{geoserverUrl}</code>. If the overlay is blank,
          confirm GeoServer is running and the <code>cp2b</code> layers are
          published (see <code>docs/GEOSERVER_INTEGRATION.md</code>).
        </p>
      </header>

      <div className="h-[520px] rounded-lg overflow-hidden border border-gray-200">
        <GeoServerDemoMap />
      </div>
    </div>
  )
}
