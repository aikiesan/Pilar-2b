'use client'

/**
 * Ask for a link to choose a new password. The answer is the same whether or
 * not the address has an approved account, so the page never tells.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import AuthShell, { Notice, fieldLabel } from '@/components/auth/AuthShell'
import { AuthError } from '@/lib/authErrors'
import { forgotPassword } from '@/lib/api/accessClient'
import { validateEmail } from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const validationMessage = useValidationMessage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const problem = validateEmail(email)
    if (problem) {
      setError(validationMessage(problem))
      return
    }
    setSending(true)
    try {
      await forgotPassword(email.trim())
      setSentTo(email.trim())
    } catch (err: unknown) {
      setError(t(`errors.${err instanceof AuthError ? err.code : 'access_failed'}`))
    } finally {
      setSending(false)
    }
  }

  const back = (
    <Link href="/login" className="font-medium text-terra-600 underline hover:text-terra-700">
      {t('forgot.back_to_login')}
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell title={t('forgot.sent_title')}>
        <div className="space-y-4 text-sm text-ink">
          <p role="status">{t('forgot.sent_body', { email: sentTo })}</p>
          {back}
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('forgot.title')} intro={<p>{t('forgot.intro')}</p>}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label htmlFor="email" className={fieldLabel}>
            {t('login.email_label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            className="input-field min-h-11"
            placeholder={t('login.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={sending} className="btn-primary min-h-11">
            {sending ? t('forgot.submitting') : t('forgot.submit')}
          </button>
          {back}
        </div>
      </form>
    </AuthShell>
  )
}
