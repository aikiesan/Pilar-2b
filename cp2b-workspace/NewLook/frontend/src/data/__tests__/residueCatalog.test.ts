import { DETAILED_RESIDUES } from '../residueFactors'
import {
  CATALOG_SECTORS,
  SECTOR_SWATCH,
  allResidueParams,
  findResidue,
  isCatalogSector,
  residueFDE,
  residuePath,
  residueSlug,
  residuesInSector,
} from '../residueCatalog'

describe('residueCatalog', () => {
  it('slugs drop the sector prefix and hyphenate', () => {
    expect(residueSlug('AG_CANA_BAGACO')).toBe('cana-bagaco')
    expect(residueSlug('PEC_ESTERCO_BOVINO')).toBe('esterco-bovino')
    expect(residueSlug('URB_LODO_PRIMARIO')).toBe('lodo-primario')
    expect(residueSlug('IND_SORO_LATICINIOS')).toBe('soro-laticinios')
  })

  it('gives every residue a unique URL', () => {
    const paths = DETAILED_RESIDUES.map(residuePath)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path).toMatch(/^\/data\/[a-z]+\/[a-z0-9-]+$/)
  })

  it('finds each residue back from its own URL params', () => {
    for (const { sector, residue } of allResidueParams()) {
      const found = findResidue(sector, residue)
      expect(found).toBeDefined()
      expect(residuePath(found!)).toBe(`/data/${sector}/${residue}`)
    }
    expect(findResidue('agricultural', 'not-a-residue')).toBeUndefined()
    expect(findResidue('livestock', 'cana-bagaco')).toBeUndefined()
  })

  it('covers every residue in exactly one sector, each with a swatch', () => {
    const total = CATALOG_SECTORS.reduce((n, s) => n + residuesInSector(s).length, 0)
    expect(total).toBe(DETAILED_RESIDUES.length)
    for (const s of CATALOG_SECTORS) expect(SECTOR_SWATCH[s]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(isCatalogSector('urban')).toBe(true)
    expect(isCatalogSector('forestry')).toBe(false)
  })

  it('computes FDE as FC × (1 − FCp) × FS × FL', () => {
    for (const r of DETAILED_RESIDUES) {
      expect(residueFDE(r)).toBeCloseTo(r.fc * (1 - r.fcp) * r.fs * r.fl, 10)
    }
  })
})
