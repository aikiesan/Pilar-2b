// Legend metadata for GIS users; see src/lib/legendExports.ts.
import { mapLegendCsv } from '@/lib/legendExports'

export const dynamic = 'force-static'

export function GET() {
  return new Response(mapLegendCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pilar2b-map-legend.csv"',
    },
  })
}
