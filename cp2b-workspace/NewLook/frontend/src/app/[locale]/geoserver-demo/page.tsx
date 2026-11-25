/**
 * /geoserver-demo — developer-only GeoServer WMS check.
 *
 * The demo talks to a GeoServer that production does not run yet (its default
 * URL is localhost), so it is not a public page: it exists only when a build
 * sets NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO=true, and 404s everywhere else.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NOT_INDEXED } from '@/lib/pageMetadata'
import GeoServerDemo from './GeoServerDemo'

export const metadata: Metadata = { robots: NOT_INDEXED }

export default function GeoServerDemoPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO !== 'true') notFound()
  return <GeoServerDemo />
}
