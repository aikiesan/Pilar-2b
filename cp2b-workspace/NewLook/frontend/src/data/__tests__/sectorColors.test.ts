/** The sector colours the charts use are the ones Tailwind classes resolve to. */
import { SECTOR_COLORS } from '../sectorColors'
const palette = require('../../styles/palette.js')

describe('sector colours', () => {
  it('match the palette tailwind.config.js reads', () => {
    expect(SECTOR_COLORS.agricultural).toBe(palette.sector.agricola)
    expect(SECTOR_COLORS.livestock).toBe(palette.sector.pecuaria)
    expect(SECTOR_COLORS.urban).toBe(palette.sector.urbano)
  })

  it('are told apart from one another', () => {
    expect(new Set(Object.values(SECTOR_COLORS)).size).toBe(3)
  })
})
