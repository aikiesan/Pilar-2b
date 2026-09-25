/**
 * Newsletter sign-ups and unsubscribes, stored on the UNICAMP VM
 * (backend: /api/v1/newsletter).
 *
 * The result is a code the forms word in the page's language; nothing here
 * throws.
 */
import type { Locale } from '@/config/i18n'

const API = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/newsletter`

/** The form an address came from, as the backend records it. */
export type NewsletterSource = 'footer' | 'about' | 'cookie_banner'

export type SubscribeResult = 'subscribed' | 'invalid_email' | 'rate_limited' | 'failed'

export type UnsubscribeResult = 'unsubscribed' | 'invalid_token' | 'failed'

async function post(path: string, body: object): Promise<number | null> {
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return response.status
  } catch {
    return null // offline, or the server could not be reached
  }
}

/**
 * Subscribe `email`. Called only from the visitor's own submit, which is the
 * consent the backend records (with the privacy notice version and the time).
 */
export async function subscribeToNewsletter(
  email: string,
  source: NewsletterSource,
  locale: Locale
): Promise<SubscribeResult> {
  const status = await post('/subscribe', { email, source, locale, consent: true })
  if (status !== null && status >= 200 && status < 300) return 'subscribed'
  if (status === 422) return 'invalid_email'
  if (status === 429) return 'rate_limited'
  return 'failed'
}

/** Unsubscribe by the token of an unsubscribe link. */
export async function unsubscribeFromNewsletter(token: string): Promise<UnsubscribeResult> {
  const status = await post('/unsubscribe', { token })
  if (status !== null && status >= 200 && status < 300) return 'unsubscribed'
  if (status === 404 || status === 422) return 'invalid_token'
  return 'failed'
}
