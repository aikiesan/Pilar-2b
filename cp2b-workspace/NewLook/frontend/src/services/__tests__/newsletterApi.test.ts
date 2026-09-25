import { subscribeToNewsletter, unsubscribeFromNewsletter } from '../newsletterApi'

const reply = (status: number) => jest.fn(() => Promise.resolve({ status, ok: status < 300 }))

afterEach(() => jest.restoreAllMocks())

describe('newsletter API', () => {
  it('posts the address with the form, the language and the consent', async () => {
    const fetchMock = reply(200)
    global.fetch = fetchMock as unknown as typeof fetch

    expect(await subscribeToNewsletter('ana@example.org', 'footer', 'en')).toBe('subscribed')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/newsletter\/subscribe$/)
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ana@example.org',
      source: 'footer',
      locale: 'en',
      consent: true,
    })
  })

  it.each([
    [422, 'invalid_email'],
    [429, 'rate_limited'],
    [500, 'failed'],
    [403, 'failed'],
  ])('answers %i as %s', async (status, result) => {
    global.fetch = reply(status) as unknown as typeof fetch
    expect(await subscribeToNewsletter('ana@example.org', 'about', 'pt-BR')).toBe(result)
  })

  it('reports an unreachable server as failed', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch
    expect(await subscribeToNewsletter('ana@example.org', 'about', 'pt-BR')).toBe('failed')
  })

  it.each([
    [200, 'unsubscribed'],
    [404, 'invalid_token'],
    [422, 'invalid_token'],
    [500, 'failed'],
  ])('unsubscribe answers %i as %s', async (status, result) => {
    global.fetch = reply(status) as unknown as typeof fetch
    expect(await unsubscribeFromNewsletter('3f2b8c1e-6d4a-4f7e-9b1a-2c5d8e9f0a1b')).toBe(result)
  })
})
