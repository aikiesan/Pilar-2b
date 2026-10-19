/**
 * The municipality page's climate card: the GHG module's answer summed by
 * residue. Illustrative values, not platform data.
 */
import { climateFrom } from '../municipalityClimate'

const BODY = {
  gwp_version: 'AR6',
  totals: { be_methane_t: 900, be_fossil_t: 300, pe_total_t: 100, er_net_t: 1100 },
  substrates: [
    { substrate: 'SUINOS', residue: 'swine', er_net_t: 800 },
    { substrate: 'PALHA', residue: 'sugarcane', er_net_t: 150 },
    { substrate: 'VINHACA', residue: 'sugarcane', er_net_t: 150 },
    { substrate: 'LODO_ETE', residue: 'sewage', er_net_t: 0 },
  ],
  unverified: ['linhas_de_base.lagoa_anaerobia'],
}

describe('climateFrom', () => {
  it('is null without an answer or a served net total', () => {
    expect(climateFrom(null)).toBeNull()
    expect(climateFrom({ totals: {} })).toBeNull()
  })

  it('keeps the totals and sums substrates into residues, largest first, zeros dropped', () => {
    const c = climateFrom(BODY)!
    expect([c.methaneT, c.fossilT, c.projectT, c.netT]).toEqual([900, 300, 100, 1100])
    expect(c.residues).toEqual([
      { key: 'swine', netT: 800 },
      { key: 'sugarcane', netT: 300 },
    ])
    expect(c.gwpVersion).toBe('AR6')
    expect(c.unverified).toBe(true)
  })

  it('says nothing is unverified only when the list is empty', () => {
    expect(climateFrom({ ...BODY, unverified: [] })!.unverified).toBe(false)
  })
})
