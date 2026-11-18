import { renderHook } from '@testing-library/react'
import { useSelectionLabel } from './useSelectionLabel'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

describe('useSelectionLabel', () => {
  const label = () => renderHook(() => useSelectionLabel()).result.current

  it('names the total and each sector', () => {
    expect(label()('total', [])).toBe('Total')
    expect(label()('agricultural', [])).toBe('Agrícola')
    expect(label()('livestock', [])).toBe('Pecuária')
    expect(label()('urban', [])).toBe('Urbano')
  })

  it('names a single residue', () => {
    expect(label()('total', ['sewage'])).toBe('Lodo de ETE')
  })

  it('counts several residues', () => {
    expect(label()('total', ['corn', 'soybean', 'coffee'])).toBe('3 resíduos')
  })

  it('lets a residue selection win over the sector, as the value accessors do', () => {
    expect(label()('livestock', ['sugarcane'])).toBe('Cana-de-açúcar')
  })
})
