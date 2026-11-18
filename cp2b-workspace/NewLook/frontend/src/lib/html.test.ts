import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('neutralises markup in a value', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('keeps names readable', () => {
    expect(escapeHtml("Santa Bárbara d'Oeste")).toBe('Santa Bárbara d&#39;Oeste')
    expect(escapeHtml('Bagaço & palha')).toBe('Bagaço &amp; palha')
  })

  it('writes nothing for a missing value, and numbers as text', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(645)).toBe('645')
  })
})
