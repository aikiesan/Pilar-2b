import { catalogResidues, distanceKm, findSeat, mainResidue, seatName } from '../municipalityPlace'

// Regions, centroids and totals as the production API served them on 24/11/2026.
const taciba = { ibge: '3552908', name: 'Taciba', immediateRegion: 'Presidente Prudente', intermediateRegion: 'Presidente Prudente' }
const lins = { ibge: '3527108', name: 'Lins', immediateRegion: 'Lins', intermediateRegion: 'Bauru' }
const campinas = { ibge: '3509502', name: 'Campinas', immediateRegion: 'Campinas', intermediateRegion: 'Campinas' }

describe('seatName', () => {
  it('looks to the immediate region seat', () => {
    expect(seatName(taciba)).toBe('Presidente Prudente')
  })
  it('looks to the intermediate seat from an immediate seat', () => {
    expect(seatName(lins)).toBe('Bauru')
  })
  it('says nothing for the seat of both', () => {
    expect(seatName(campinas)).toBeNull()
  })
})

describe('findSeat', () => {
  const directory = [
    { name: 'Bauru', ibge: '3506003', slug: 'bauru-sp' },
    { name: 'Presidente Prudente', ibge: '3541406', slug: 'presidente-prudente-sp' },
  ]
  it('finds the seat by name in the same state', () => {
    expect(findSeat(lins, directory)?.ibge).toBe('3506003')
  })
  it('finds nothing in another state', () => {
    expect(findSeat({ ...lins, ibge: '3127107' }, directory)).toBeNull()
  })
})

describe('distanceKm', () => {
  it('measures Taciba to Presidente Prudente and Lins to Bauru', () => {
    expect(Math.round(distanceKm({ lat: -22.504876, lng: -51.342336 }, { lat: -21.993025, lng: -51.34304 }))).toBe(57)
    expect(Math.round(distanceKm({ lat: -21.649741, lng: -49.682837 }, { lat: -22.253965, lng: -49.126158 }))).toBe(88)
  })
})

describe('mainResidue', () => {
  it('gives the largest residue and its share', () => {
    const top = mainResidue({
      n4: 8_938_760,
      residues: [
        { key: 'corn', sector: 'agricultural', n4: 173_405 },
        { key: 'sugarcane', sector: 'agricultural', n4: 8_744_761 },
      ],
    })
    expect(top?.key).toBe('sugarcane')
    expect(top?.share).toBeCloseTo(0.978, 3)
  })
  it('is null without a served total', () => {
    expect(mainResidue({ n4: null, residues: [] })).toBeNull()
  })
})

describe('catalogResidues', () => {
  it('maps sugarcane to its four streams', () => {
    expect(catalogResidues('sugarcane').map((r) => r.code).sort()).toEqual(
      ['AG_CANA_BAGACO', 'AG_CANA_PALHA', 'AG_CANA_TORTA_FILTRO', 'AG_CANA_VINHACA'],
    )
  })
  it('has no page for urban pruning', () => {
    expect(catalogResidues('rpo')).toEqual([])
  })
})
