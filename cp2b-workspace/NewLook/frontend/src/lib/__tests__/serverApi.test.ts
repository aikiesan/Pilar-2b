import { countFrom, serverApiBase } from '../serverApi'

describe('serverApiBase', () => {
  const env = process.env
  afterEach(() => {
    process.env = env
  })

  it('prefers API_INTERNAL_URL', () => {
    process.env = { ...env, API_INTERNAL_URL: 'http://10.0.0.2:8001/', NEXT_PUBLIC_API_URL: 'http://x' }
    expect(serverApiBase()).toBe('http://10.0.0.2:8001')
  })

  it('uses an absolute NEXT_PUBLIC_API_URL, but not a relative one', () => {
    process.env = { ...env, API_INTERNAL_URL: '', NEXT_PUBLIC_API_URL: 'http://localhost:8000' }
    expect(serverApiBase()).toBe('http://localhost:8000')
    process.env = { ...env, API_INTERNAL_URL: '', NEXT_PUBLIC_API_URL: '/pilar2b' }
    expect(serverApiBase()).toBe('http://127.0.0.1:8001')
  })
})

describe('countFrom', () => {
  it('keeps non-negative integers only', () => {
    expect(countFrom(645)).toBe(645)
    expect(countFrom(0)).toBe(0)
    expect(countFrom(-1)).toBeNull()
    expect(countFrom(1.5)).toBeNull()
    expect(countFrom('645')).toBeNull()
    expect(countFrom(undefined)).toBeNull()
  })
})
