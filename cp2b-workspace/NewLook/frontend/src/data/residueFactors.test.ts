import { calculateFDE } from '@/types/analysis'
import { DETAILED_RESIDUES, getParentCrop, getResidueByCode, getResiduesByCategory, type FactorKey } from './residueFactors'

const FACTORS: FactorKey[] = ['fc', 'fcp', 'fs', 'fl']
const PORTUGUESE_LETTERS = /[ãõçáéíóúâêô]/i

describe('residueFactors', () => {
  it('names every residue in both languages', () => {
    for (const residue of DETAILED_RESIDUES) {
      expect(residue.name['pt-BR']).toBeTruthy()
      expect(residue.name.en).toBeTruthy()
      expect(residue.name.en).not.toMatch(PORTUGUESE_LETTERS)
    }
  })

  it('justifies every factor in both languages', () => {
    for (const residue of DETAILED_RESIDUES) {
      for (const key of FACTORS) {
        const { 'pt-BR': pt, en } = residue.justification[key]
        expect(pt).toBeTruthy()
        expect(en).toBeTruthy()
        expect(en).not.toMatch(PORTUGUESE_LETTERS)
      }
    }
  })

  it('keeps every factor a fraction', () => {
    for (const residue of DETAILED_RESIDUES) {
      for (const key of FACTORS) {
        expect(residue[key]).toBeGreaterThanOrEqual(0)
        expect(residue[key]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('derives FDE from the four factors', () => {
    // Primary sludge: 0.85 × (1 − 0.25) × 0.95 × 0.9, the source sheet's 54.51%.
    expect(calculateFDE(getResidueByCode('URB_LODO_PRIMARIO')!) * 100).toBeCloseTo(54.51, 2)
    // Bagasse all goes to cogeneration (FCp = 1): nothing left for biogas.
    expect(calculateFDE(getResidueByCode('AG_CANA_BAGACO')!)).toBe(0)
  })

  it('has unique codes, each found by getResidueByCode', () => {
    const codes = DETAILED_RESIDUES.map((r) => r.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(getResidueByCode(code)?.code).toBe(code)
  })

  it('groups agricultural residues by crop key, not by a display name', () => {
    expect(getParentCrop('AG_CANA_VINHACA')).toBe('sugarcane')
    expect(getParentCrop('AG_SOJA_PALHA')).toBe('soybean')
    expect(getParentCrop('AG_CAFE_CASCA')).toBe('coffee')
    expect(getParentCrop('IND_TRUB_CERVEJA')).toBe('other')
    for (const r of getResiduesByCategory('agricultural')) {
      expect(getParentCrop(r.code)).not.toBe('other')
    }
  })
})
