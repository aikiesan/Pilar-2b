/**
 * Why signing in, asking for access or a password step failed, as a code the
 * forms word in the page's language (auth.errors.<code>). The backend's own
 * message is English only.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_inactive'
  | 'account_locked'
  | 'email_taken'
  | 'email_not_verified'
  | 'pending_review'
  | 'rejected'
  | 'invalid_token'
  | 'too_many_attempts'
  | 'network'
  | 'login_failed'
  | 'registration_failed'
  | 'access_failed'

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    readonly status?: number
  ) {
    super(code)
    this.name = 'AuthError'
  }
}

/** Codes the backend sends in `detail.code` (services/auth_service.py). */
const BACKEND_CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  account_inactive: 'account_inactive',
  account_locked: 'account_locked',
  email_taken: 'email_taken',
  email_not_verified: 'email_not_verified',
  pending_review: 'pending_review',
  rejected: 'rejected',
  invalid_token: 'invalid_token',
}

const FALLBACK: Record<'login' | 'registration' | 'access', AuthErrorCode> = {
  login: 'login_failed',
  registration: 'registration_failed',
  access: 'access_failed',
}

/**
 * The error a failed response stands for: the backend's code when it sends
 * one, else what the status means for this form.
 */
export async function authErrorFrom(
  response: Response,
  form: 'login' | 'registration' | 'access'
): Promise<AuthError> {
  const body: { detail?: { code?: string } } | null = await response.json().catch(() => null)
  const code = BACKEND_CODES[body?.detail?.code ?? '']
  if (code) return new AuthError(code, response.status)
  if (response.status === 429) return new AuthError('too_many_attempts', 429)
  if (form === 'login' && response.status === 401) return new AuthError('invalid_credentials', 401)
  return new AuthError(FALLBACK[form], response.status)
}
