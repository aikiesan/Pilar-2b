import { bmpErrorPercent, cnLevel, hasCompleteFde, isScientificView, type ResidueRecord } from '../scientific'
import { residueName } from '@/hooks/useResidueName'

describe('scientific model helpers', () => {
  it('places C:N ratios in the digestion bands, and knows when there is none', () => {
    expect(cnLevel(15)).toBe('low')
    expect(cnLevel(20)).toBe('optimal')
    expect(cnLevel(30)).toBe('optimal')
    expect(cnLevel(35)).toBe('high')
    expect(cnLevel(108)).toBe('very_high')
    // A missing ratio used to be painted red as "very high".
    expect(cnLevel(null)).toBeNull()
    expect(cnLevel(undefined)).toBeNull()
    expect(cnLevel(0)).toBeNull()
  })

  it('computes the simulated BMP error only when there is an experimental value', () => {
    expect(bmpErrorPercent(200, 210)).toBeCloseTo(5)
    expect(bmpErrorPercent(0, 210)).toBeNull()
  })

  it('counts a residue as FDE-complete only with all four factors', () => {
    const base = { id: 1, codigo: 'X', nome: 'X', sector_codigo: 'UR_URBANO' } as ResidueRecord
    expect(hasCompleteFde({ ...base, fc_medio: 0.8, fcp_medio: 0, fs_medio: 1, fl_medio: 0.9 })).toBe(true)
    expect(hasCompleteFde({ ...base, fc_medio: 0.8, fcp_medio: 0.2, fs_medio: 1 })).toBe(false)
  })

  it('accepts only known tabs from the address', () => {
    expect(isScientificView('references')).toBe(true)
    expect(isScientificView('residuosDb')).toBe(false)
    expect(isScientificView(null)).toBe(false)
  })

  it("names residues in the page's language, falling back to Portuguese", () => {
    expect(residueName({ nome: 'Vinhaça', nome_en: 'Vinasse' }, 'en')).toBe('Vinasse')
    expect(residueName({ nome: 'Vinhaça', nome_en: 'Vinasse' }, 'pt-BR')).toBe('Vinhaça')
    expect(residueName({ nome: 'Vinhaça', nome_en: null }, 'en')).toBe('Vinhaça')
    expect(residueName({ nome: 'Vinhaça', nome_en: '  ' }, 'en')).toBe('Vinhaça')
  })
})
