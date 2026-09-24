/**
 * Why signing in or signing up failed, as a code the forms word in the page's
 * language (auth.errors.<code>). The backend's own message is English only.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_inactive'
  | 'account_locked'
  | 'email_taken'
  | 'invite_only'
  | 'too_many_attempts'
  | 'network'
  | 'login_failed'
  | 'registration_failed'

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
}

/**
 * The error a failed response stands for: the backend's code when it sends
 * one, else what the status means for this form.
 */
export async function authErrorFrom(response: Response, form: 'login' | 'registration'): Promise<AuthError> {
  const body: { detail?: { code?: string } } | null = await response.json().catch(() => null)
  const code = BACKEND_CODES[body?.detail?.code ?? '']
  if (code) return new AuthError(code, response.status)
  if (response.status === 429) return new AuthError('too_many_attempts', 429)
  if (form === 'login' && response.status === 401) return new AuthError('invalid_credentials', 401)
  // Accounts are created by an admin: anyone else is turned away with 401/403.
  if (form === 'registration' && (response.status === 401 || response.status === 403)) {
    return new AuthError('invite_only', response.status)
  }
  return new AuthError(form === 'login' ? 'login_failed' : 'registration_failed', response.status)
}
