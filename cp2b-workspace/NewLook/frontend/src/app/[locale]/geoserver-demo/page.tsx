/**
 * /geoserver-demo — developer-only GeoServer WMS check.
 *
 * The demo talks to a GeoServer that production does not run yet (its default
 * URL is localhost), so it is not a public page: it exists only when a build
 * sets NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO=true, and 404s everywhere else.
 */
import { notFound } from 'next/navigation'
import GeoServerDemo from './GeoServerDemo'

export default function GeoServerDemoPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO !== 'true') notFound()
  return <GeoServerDemo />
}
