import {
  ProximityError,
  analyzeProximity,
  dominantLandUseClass,
  generateShareURL,
  type LandUseClass,
} from './proximityApi'

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))
// No cache between tests, and no real backoff delays.
jest.mock('@/lib/apiCache', () => ({
  getFromCache: () => null,
  setInCache: jest.fn(),
  generateCacheKey: () => 'key',
  CACHE_DURATION: { analysis: 0 },
}))
jest.mock('@/lib/performance', () => {
  const actual = jest.requireActual('@/lib/performance')
  return {
    ...actual,
    measurePerformance: (_: string, fn: () => unknown) => fn(),
    retryOperation: (op: () => Promise<unknown>, retries: number, _delay: number, shouldRetry: (e: unknown) => boolean) =>
      actual.retryOperation(op, retries, 0, shouldRetry),
  }
})

const request = { latitude: -22.9, longitude: -47.06, radius_km: 20 }

function respond(status: number, body: unknown) {
  return Promise.resolve({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) } as Response)
}

describe('analyzeProximity', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('returns the backend result as sent', async () => {
    const body = { analysis_id: 'a1', request, results: { municipalities: [] }, summary: {}, metadata: { processing_time_ms: 5 } }
    fetchMock.mockReturnValue(respond(200, body))
    await expect(analyzeProximity(request)).resolves.toEqual(body)
  })

  it('maps a 429 to rate_limited, with the wait, and does not retry it', async () => {
    fetchMock.mockReturnValue(respond(429, { retry_after: 30 }))
    const error = await analyzeProximity(request).catch((e) => e)
    expect(error).toBeInstanceOf(ProximityError)
    expect(error).toMatchObject({ code: 'rate_limited', retryAfter: 30 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps backend validation codes, and does not retry a rejected request', async () => {
    fetchMock.mockReturnValue(respond(400, { detail: { error: 'Raio inválido', code: 'INVALID_RADIUS', suggestion: '…' } }))
    await expect(analyzeProximity(request)).rejects.toMatchObject({ code: 'invalid_radius' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries a server error, then reports it', async () => {
    fetchMock.mockReturnValue(respond(500, { detail: 'boom' }))
    await expect(analyzeProximity(request)).rejects.toMatchObject({ code: 'server', status: 500 })
    expect(fetchMock).toHaveBeenCalledTimes(3) // first try + 2 retries
  })

  it('reports a dropped connection as a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(analyzeProximity(request)).rejects.toMatchObject({ code: 'network' })
  })

  it('carries no user-facing text in its errors', async () => {
    fetchMock.mockReturnValue(respond(400, { detail: { code: 'INVALID_COORDINATES' } }))
    const error: ProximityError = await analyzeProximity(request).catch((e) => e)
    expect(error.code).toBe('invalid_coordinates')
    expect(error.message).not.toMatch(/[ãõçáéíóúâêô]/i)
  })
})

describe('dominantLandUseClass', () => {
  const entry = (class_id: number, pixel_count: number): LandUseClass => ({
    class_id, pixel_count, name: '', color: '#000', category: 'agricultural', area_km2: 0, percent: 0,
  })

  it('picks the class with the most pixels', () => {
    expect(dominantLandUseClass({ '15': entry(15, 900), '20': entry(20, 1200), '3': entry(3, 50) })?.class_id).toBe(20)
  })

  it('is null for an empty breakdown', () => {
    expect(dominantLandUseClass({})).toBeNull()
  })
})

describe('generateShareURL', () => {
  it('keeps the sharer’s language in the link', () => {
    expect(generateShareURL(-22.9, -47.06, 20, 'en')).toBe(
      `${window.location.origin}/en/dashboard/proximity?lat=-22.900000&lng=-47.060000&radius=20`
    )
  })
})
