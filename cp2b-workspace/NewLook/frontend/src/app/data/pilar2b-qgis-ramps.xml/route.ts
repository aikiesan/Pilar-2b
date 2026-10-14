// Legend metadata for GIS users; see src/lib/legendExports.ts.
import { qgisRampsXml } from '@/lib/legendExports'

export const dynamic = 'force-static'

export function GET() {
  return new Response(qgisRampsXml(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pilar2b-qgis-ramps.xml"',
    },
  })
}
