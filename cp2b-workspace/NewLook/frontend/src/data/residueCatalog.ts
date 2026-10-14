/**
 * The data catalogue's view of the residues in residueFactors.ts: their sector
 * order, their URL slugs and their FDE.
 *
 * URLs are /data/<sector>/<slug>. The sector is the residue's category
 * (agricultural, livestock, urban, industrial). The slug is its code without
 * the sector prefix, lower-cased and hyphenated: AG_CANA_BAGACO is
 * /data/agricultural/cana-bagaco. The code is the residue's stable identifier,
 * shared with the database and the API, so the URL stays put when a display
 * name is reworded.
 */
import { DETAILED_RESIDUES, type DetailedResidue } from './residueFactors'
import { SECTOR_COLORS } from './sectorColors'
import { calculateFDE } from '@/types/analysis'

export type CatalogSector = DetailedResidue['category']

/** Display order, the same as the landing page and the map. */
export const CATALOG_SECTORS: CatalogSector[] = ['agricultural', 'livestock', 'urban', 'industrial']

/** Sector swatches; industrial residues have no map colour of their own yet, so a neutral greige. */
export const SECTOR_SWATCH: Record<CatalogSector, string> = { ...SECTOR_COLORS, industrial: '#8F8478' }

const CODE_PREFIX = /^(AG|PEC|URB|IND)_/

export function residueSlug(code: string): string {
  return code.replace(CODE_PREFIX, '').toLowerCase().replace(/_/g, '-')
}

export function isCatalogSector(value: string): value is CatalogSector {
  return (CATALOG_SECTORS as string[]).includes(value)
}

export function residuesInSector(sector: CatalogSector): DetailedResidue[] {
  return DETAILED_RESIDUES.filter((r) => r.category === sector)
}

export function findResidue(sector: string, slug: string): DetailedResidue | undefined {
  return DETAILED_RESIDUES.find((r) => r.category === sector && residueSlug(r.code) === slug)
}

/** Path of a residue's product page, for Link from @/navigation. */
export function residuePath(residue: Pick<DetailedResidue, 'category' | 'code'>): string {
  return `/data/${residue.category}/${residueSlug(residue.code)}`
}

/** FDE = FC × (1 − FCp) × FS × FL, never stored, always computed from the four factors. */
export function residueFDE(residue: DetailedResidue): number {
  return calculateFDE({ fc: residue.fc, fcp: residue.fcp, fs: residue.fs, fl: residue.fl })
}

/** Every (sector, slug) pair, for generateStaticParams and the sitemap. */
export function allResidueParams(): { sector: CatalogSector; residue: string }[] {
  return DETAILED_RESIDUES.map((r) => ({ sector: r.category, residue: residueSlug(r.code) }))
}
