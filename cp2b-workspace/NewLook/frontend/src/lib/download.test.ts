import { csvField, datedFilename, downloadBlob, toCsv } from './download'

describe('csvField', () => {
  it('leaves plain values alone', () => {
    expect(csvField('Campinas')).toBe('Campinas')
    expect(csvField(1234.5)).toBe('1234.5')
  })

  it('quotes commas, quotes and line breaks, doubling inner quotes', () => {
    expect(csvField('Mogi Guaçu, SP')).toBe('"Mogi Guaçu, SP"')
    expect(csvField('the "real" scenario')).toBe('"the ""real"" scenario"')
    expect(csvField('two\nlines')).toBe('"two\nlines"')
  })

  it('writes missing values as empty fields', () => {
    expect(csvField(null)).toBe('')
    expect(csvField(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  it('joins fields with commas and rows with line breaks', () => {
    expect(toCsv([['Municipality', 'Biogas'], ['São Paulo, SP', 12.5], ['Campinas', null]])).toBe(
      'Municipality,Biogas\n"São Paulo, SP",12.5\nCampinas,'
    )
  })
})

describe('datedFilename', () => {
  afterEach(() => jest.useRealTimers())

  it('appends the date to the stem', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-24T15:00:00Z'))
    expect(datedFilename('cp2b-biogas-data', 'csv')).toBe('cp2b-biogas-data-2026-09-24.csv')
  })
})

describe('downloadBlob', () => {
  const createObjectURL = jest.fn(() => 'blob:cp2b')
  const revokeObjectURL = jest.fn()

  beforeEach(() => {
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('saves nothing while data exports are off (beta)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    downloadBlob(new Blob(['x']), 'data.csv')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('clicks a download link, then releases the object URL, once exports are on', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/featureFlags', () => ({ DATA_EXPORT_ENABLED: true, DATA_EXPORT_DISABLED_REASON: '' }))
      const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('data.csv')
        expect(this.href).toBe('blob:cp2b')
      })
      const { downloadBlob: enabledDownload } = require('./download') as typeof import('./download')
      enabledDownload(new Blob(['x']), 'data.csv')
      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:cp2b')
      click.mockRestore()
    })
  })
})
