import {
  MISSING_VALUE,
  createFormatters,
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  isFiniteNumber,
} from './format'

// Intl separates "1,2 mi" and "R$ 1.234" with a no-break space; compare on
// plain spaces so a failing assertion prints something readable.
const plain = (text: string) => text.replace(/\u00a0|\u202f/g, ' ')

describe('isFiniteNumber', () => {
  it.each([0, -1, 3.14, 1e21])('accepts %p', (value) => {
    expect(isFiniteNumber(value)).toBe(true)
  })

  it.each([null, undefined, NaN, Infinity, -Infinity, '12', {}])('rejects %p', (value) => {
    expect(isFiniteNumber(value)).toBe(false)
  })
})

describe('formatNumber', () => {
  it('groups digits the way each locale does', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567')
    expect(formatNumber(1234567, 'pt-BR')).toBe('1.234.567')
  })

  it('rounds to whole numbers unless decimals are requested', () => {
    expect(formatNumber(1234.56, 'en')).toBe('1,235')
    expect(formatNumber(1234.56, 'en', { decimals: 1 })).toBe('1,234.6')
    expect(formatNumber(1234.56, 'pt-BR', { decimals: 1 })).toBe('1.234,6')
  })

  it('pads to fixed width when minDecimals is set', () => {
    expect(formatNumber(2, 'en', { decimals: 2, minDecimals: 2 })).toBe('2.00')
  })

  it('never lets minDecimals exceed decimals (Intl would throw)', () => {
    expect(formatNumber(2.5, 'en', { decimals: 1, minDecimals: 3 })).toBe('2.5')
  })

  it.each([null, undefined, NaN, Infinity])('renders %p as the missing marker', (value) => {
    expect(formatNumber(value, 'en')).toBe(MISSING_VALUE)
  })

  it('keeps zero, which is a measurement and not a missing value', () => {
    expect(formatNumber(0, 'pt-BR')).toBe('0')
  })
})

describe('formatCompact', () => {
  it('uses each locale’s own short-scale suffixes', () => {
    expect(formatCompact(1_234_567, 'en')).toBe('1.2M')
    expect(plain(formatCompact(1_234_567, 'pt-BR'))).toBe('1,2 mi')
    expect(formatCompact(3_400_000_000, 'en')).toBe('3.4B')
    expect(plain(formatCompact(3_400_000_000, 'pt-BR'))).toBe('3,4 bi')
    expect(formatCompact(56_789, 'en')).toBe('57K')
    expect(plain(formatCompact(56_789, 'pt-BR'))).toBe('57 mil')
  })

  it('keeps two significant digits by default, like the map legend always did', () => {
    expect(formatCompact(1_234, 'en')).toBe('1.2K')
    expect(formatCompact(12_345, 'en')).toBe('12K')
    expect(formatCompact(123_456, 'en')).toBe('123K')
  })

  it('prints values below a thousand in full', () => {
    expect(formatCompact(999, 'en')).toBe('999')
  })

  it('honors a requested fixed precision', () => {
    expect(formatCompact(1_234_567, 'en', { decimals: 2 })).toBe('1.23M')
    expect(formatCompact(56_789, 'en', { decimals: 1 })).toBe('56.8K')
    expect(formatCompact(2_000_000, 'en', { decimals: 1, minDecimals: 1 })).toBe('2.0M')
  })

  it('renders missing values as the missing marker', () => {
    expect(formatCompact(undefined, 'en')).toBe(MISSING_VALUE)
  })
})

describe('formatPercent', () => {
  it('takes percentage points, not a ratio', () => {
    expect(formatPercent(45.23, 'en')).toBe('45.2%')
    expect(formatPercent(45.23, 'pt-BR')).toBe('45,2%')
  })

  it('honors the requested precision', () => {
    expect(formatPercent(12, 'en', { decimals: 0 })).toBe('12%')
    expect(formatPercent(12, 'en', { decimals: 1, minDecimals: 1 })).toBe('12.0%')
  })

  it('renders missing values as the missing marker', () => {
    expect(formatPercent(null, 'pt-BR')).toBe(MISSING_VALUE)
  })
})

describe('formatCurrency', () => {
  it('formats reais in each locale’s convention', () => {
    expect(formatCurrency(1_234_567, 'en')).toBe('R$1,234,567')
    expect(plain(formatCurrency(1_234_567, 'pt-BR'))).toBe('R$ 1.234.567')
  })

  it('supports another currency and cents', () => {
    expect(formatCurrency(12.5, 'en', { currency: 'USD', decimals: 2, minDecimals: 2 })).toBe('$12.50')
  })

  it('renders missing values as the missing marker', () => {
    expect(formatCurrency(NaN, 'en')).toBe(MISSING_VALUE)
  })
})

describe('formatDate', () => {
  const date = '2026-09-23T12:00:00Z'

  it('writes a long date in each locale', () => {
    expect(formatDate(date, 'en')).toBe('September 23, 2026')
    expect(formatDate(date, 'pt-BR')).toBe('23 de setembro de 2026')
  })

  it('accepts Date instances, timestamps and custom options', () => {
    expect(formatDate(new Date(date), 'en', { year: 'numeric' })).toBe('2026')
    expect(formatDate(Date.parse(date), 'en', { month: 'short', timeZone: 'UTC' })).toBe('Sep')
  })

  it.each([null, undefined, '', 'not a date'])('renders %p as the missing marker', (value) => {
    expect(formatDate(value, 'en')).toBe(MISSING_VALUE)
  })
})

describe('createFormatters', () => {
  it('binds every formatter to one locale', () => {
    const en = createFormatters('en')
    const pt = createFormatters('pt-BR')

    expect(en.locale).toBe('en')
    expect(en.number(1234.5, { decimals: 1 })).toBe('1,234.5')
    expect(pt.number(1234.5, { decimals: 1 })).toBe('1.234,5')
    expect(en.compact(2_000_000)).toBe('2M')
    expect(en.percent(50)).toBe('50%')
    expect(en.currency(10)).toBe('R$10')
    expect(en.date('2026-01-15T12:00:00Z', { month: 'long', timeZone: 'UTC' })).toBe('January')
  })
})
