// Legend metadata for GIS users; see src/lib/legendExports.ts.
import { residueCodesCsv } from '@/lib/legendExports'

export const dynamic = 'force-static'

export function GET() {
  return new Response(residueCodesCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pilar2b-residue-codes.csv"',
    },
  })
}
