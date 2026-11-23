import { AuthError, authErrorFrom } from './authErrors'

const response = (status: number, body?: unknown) =>
  ({ status, ok: false, json: async () => (body === undefined ? Promise.reject(new Error('no body')) : body) }) as unknown as Response

describe('authErrorFrom', () => {
  it("uses the backend's code when it sends one", async () => {
    expect((await authErrorFrom(response(403, { detail: { code: 'account_locked', message: '…' } }), 'login')).code).toBe('account_locked')
    expect((await authErrorFrom(response(409, { detail: { code: 'email_taken', message: '…' } }), 'registration')).code).toBe('email_taken')
  })

  it('reads the status when there is no code', async () => {
    expect((await authErrorFrom(response(401, { detail: 'Not authenticated' }), 'login')).code).toBe('invalid_credentials')
    expect((await authErrorFrom(response(429), 'login')).code).toBe('too_many_attempts')
    expect((await authErrorFrom(response(403), 'registration')).code).toBe('registration_failed')
  })

  it('reads the sign-up with approval codes', async () => {
    const coded = (code: string) => response(403, { detail: { code, message: '…' } })
    expect((await authErrorFrom(coded('email_not_verified'), 'login')).code).toBe('email_not_verified')
    expect((await authErrorFrom(coded('pending_review'), 'login')).code).toBe('pending_review')
    expect((await authErrorFrom(coded('rejected'), 'login')).code).toBe('rejected')
    expect((await authErrorFrom(response(400, { detail: { code: 'invalid_token' } }), 'access')).code).toBe('invalid_token')
    expect((await authErrorFrom(response(500), 'access')).code).toBe('access_failed')
  })

  it("falls back to the form's generic failure", async () => {
    const error = await authErrorFrom(response(500, { detail: 'boom' }), 'login')
    expect(error).toBeInstanceOf(AuthError)
    expect(error.code).toBe('login_failed')
    expect(error.status).toBe(500)
    expect((await authErrorFrom(response(502), 'registration')).code).toBe('registration_failed')
  })

  it('ignores codes it does not know', async () => {
    expect((await authErrorFrom(response(400, { detail: { code: 'something_new' } }), 'login')).code).toBe('login_failed')
  })
})
