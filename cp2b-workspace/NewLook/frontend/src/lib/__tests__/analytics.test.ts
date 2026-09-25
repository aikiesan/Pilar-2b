import { deviceClass, forgetVisitor, trackPageview, VISITOR_COOKIE } from '../analytics'
import { saveConsent } from '../consent'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fetchMock = jest.fn(() => Promise.resolve({ status: 204, ok: true }))

function visitorCookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1)
}

function sent(call = 0) {
  const [url, init] = fetchMock.mock.calls[call] as unknown as [string, RequestInit]
  return { url, init, body: JSON.parse(init.body as string) }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  forgetVisitor()
  fetchMock.mockClear()
  global.fetch = fetchMock as unknown as typeof fetch
})

describe('page-view statistics', () => {
  it('sends nothing and sets no cookie without consent', () => {
    trackPageview('/map', 'en')
    saveConsent('essential')
    trackPageview('/map', 'en')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(visitorCookie()).toBeUndefined()
  })

  it('with consent sends one page view and sets the visitor cookie', () => {
    saveConsent('all')
    trackPageview('/municipality/3550308', 'pt-BR')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, init, body } = sent()
    expect(url).toMatch(/\/api\/v1\/analytics\/pageview$/)
    expect(init).toMatchObject({ method: 'POST', keepalive: true })
    expect(body).toMatchObject({ path: '/municipality/3550308', locale: 'pt-BR', device: expect.any(String) })
    expect(body.visitor_id).toMatch(UUID)
    expect(body.session_id).toMatch(UUID)
    expect(visitorCookie()).toBe(body.visitor_id)
  })

  it('keeps the same visitor and session across pages', () => {
    saveConsent('all')
    trackPageview('/map', 'en')
    trackPageview('/guide', 'en')

    expect(sent(1).body.visitor_id).toBe(sent(0).body.visitor_id)
    expect(sent(1).body.session_id).toBe(sent(0).body.session_id)
  })

  it('never sends a query string or a fragment', () => {
    saveConsent('all')
    trackPageview('/login?email=ana@example.org#top', 'en')

    expect(sent().body.path).toBe('/login')
  })

  it('names the referring site on the first page of a session only', () => {
    Object.defineProperty(document, 'referrer', { value: 'https://www.google.com/search?q=biogas', configurable: true })
    saveConsent('all')
    trackPageview('/map', 'en')
    trackPageview('/guide', 'en')

    expect(sent(0).body.referrer_host).toBe('www.google.com')
    expect(sent(1).body.referrer_host).toBeNull()
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
  })

  it('forgets the visitor when statistics are refused', () => {
    saveConsent('all')
    trackPageview('/map', 'en')
    expect(visitorCookie()).toBeDefined()

    forgetVisitor()

    expect(visitorCookie()).toBeUndefined()
    expect(sessionStorage.getItem('pilar2b-analytics-session')).toBeNull()
  })

  it('classes devices by window width', () => {
    expect(deviceClass(390)).toBe('mobile')
    expect(deviceClass(1024)).toBe('tablet')
    expect(deviceClass(1280)).toBe('desktop')
  })
})
