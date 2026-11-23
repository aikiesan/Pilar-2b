/**
 * The public steps of sign-up with approval: confirm the e-mail, send the
 * confirmation again, and the two password-reset steps. Asking for an account
 * itself goes through AuthContext.register.
 *
 * None of these need a session. Failures throw an AuthError whose code the
 * forms word in the page's language (auth.errors.<code>).
 */

import { AuthError, authErrorFrom } from '@/lib/authErrors'

const BASE = process.env.NEXT_PUBLIC_API_URL || ''
const AUTH = `${BASE}/api/v1/auth`

export type AccountStatus = 'pending_email' | 'pending_review' | 'approved' | 'rejected'

async function post(path: string, body: unknown): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${AUTH}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError('network')
  }
  if (!res.ok) throw await authErrorFrom(res, 'access')
  return res
}

/** Confirm the address from the e-mailed link; says where the request now stands. */
export async function verifyEmail(token: string): Promise<AccountStatus> {
  const res = await post('/verify-email', { token })
  return ((await res.json()) as { status: AccountStatus }).status
}

export async function resendVerification(email: string): Promise<void> {
  await post('/verify-email/resend', { email })
}

export async function forgotPassword(email: string): Promise<void> {
  await post('/password/forgot', { email })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await post('/password/reset', { token, password })
}
