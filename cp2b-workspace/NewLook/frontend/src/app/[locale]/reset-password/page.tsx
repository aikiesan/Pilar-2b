'use client'

/**
 * The link in the password e-mail lands here: choose a new password. The link
 * works once and for one hour.
 */
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import AuthShell, { Notice, fieldHint, fieldLabel } from '@/components/auth/AuthShell'
import { AuthError } from '@/lib/authErrors'
import { resetPassword } from '@/lib/api/accessClient'
import { firstError, validatePassword, validatePasswordConfirmation } from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'

const link = 'font-medium text-terra-600 underline hover:text-terra-700'

function ResetPassword() {
  const t = useTranslations('auth')
  const validationMessage = useValidationMessage()
  const token = useSearchParams().get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(!token)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const problem = firstError(validatePassword(password), validatePasswordConfirmation(password, confirm))
    if (problem) {
      setError(validationMessage(problem))
      return
    }
    setSending(true)
    try {
      await resetPassword(token ?? '', password)
      setDone(true)
    } catch (err: unknown) {
      const code = err instanceof AuthError ? err.code : 'access_failed'
      if (code === 'invalid_token') setInvalid(true)
      else setError(t(`errors.${code}`))
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <AuthShell title={t('reset.done_title')}>
        <div className="space-y-4 text-sm text-ink">
          <p role="status">{t('reset.done_body')}</p>
          <Link href="/login" className="btn-primary min-h-11">
            {t('reset.go_login')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (invalid) {
    return (
      <AuthShell title={t('verify.invalid_title')}>
        <div className="space-y-4 text-sm text-ink">
          <p role="alert">{t(token ? 'errors.invalid_token' : 'verify.missing_body')}</p>
          <Link href="/forgot-password" className={link}>
            {t('reset.request_new')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('reset.title')}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label htmlFor="password" className={fieldLabel}>
            {t('reset.password_label')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-describedby="password-hint"
            className="input-field min-h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={sending}
          />
          <p id="password-hint" className={fieldHint}>
            {t('register.password_hint')}
          </p>
        </div>
        <div>
          <label htmlFor="confirm" className={fieldLabel}>
            {t('reset.confirm_label')}
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-required="true"
            className="input-field min-h-11"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={sending}
          />
        </div>
        <button type="submit" disabled={sending} className="btn-primary min-h-11">
          {sending ? t('reset.submitting') : t('reset.submit')}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  )
}
