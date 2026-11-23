'use client'

/**
 * Ask for access. The account waits for the e-mail to be confirmed and then
 * for the CP2B team to approve it; nothing signs in from here.
 *
 * The answer is the same whether or not the address already has an account,
 * so the page always moves on to "confirm your e-mail".
 * WCAG 2.1 AA.
 */
import { useState } from 'react'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { AuthError } from '@/lib/authErrors'
import { resendVerification } from '@/lib/api/accessClient'
import {
  firstError,
  passwordStrength as scorePassword,
  validateConsent,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'
import AuthShell, { Notice, fieldHint, fieldLabel } from '@/components/auth/AuthShell'

const PURPOSE_MIN = 10
const PURPOSE_MAX = 500

export default function RegisterPage() {
  const { register } = useAuth()
  const t = useTranslations('auth')
  const validationMessage = useValidationMessage()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    institution: '',
    purpose: '',
    password: '',
    confirmPassword: '',
    website: '',
  })
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const strength = scorePassword(form.password)
  const strengthText =
    strength === 0
      ? ''
      : strength < 40
        ? t('register.password_weak')
        : strength < 70
          ? t('register.password_medium')
          : t('register.password_strong')
  const strengthColor = strength < 40 ? 'bg-red-500' : strength < 70 ? 'bg-yellow-500' : 'bg-terra-500'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const purpose = form.purpose.trim()
    const problem = firstError(
      validateRequired(form.full_name),
      validateEmail(form.email),
      validateRequired(form.institution),
      validateRequired(purpose),
      validatePassword(form.password),
      validatePasswordConfirmation(form.password, form.confirmPassword),
      validateConsent(consent)
    )
    if (problem) {
      setError(validationMessage(problem))
      return
    }
    if (purpose.length < PURPOSE_MIN) {
      setError(t('register.purpose_hint'))
      return
    }
    setSending(true)
    try {
      const email = form.email.trim()
      await register({
        email,
        password: form.password,
        full_name: form.full_name.trim(),
        institution: form.institution.trim(),
        purpose,
        accept_terms: consent,
        website: form.website,
      })
      setSentTo(email)
    } catch (err: unknown) {
      setError(t(`errors.${err instanceof AuthError ? err.code : 'registration_failed'}`))
    } finally {
      setSending(false)
    }
  }

  const resend = async () => {
    if (!sentTo) return
    try {
      await resendVerification(sentTo)
      setResent(true)
    } catch (err: unknown) {
      setError(t(`errors.${err instanceof AuthError ? err.code : 'access_failed'}`))
    }
  }

  if (sentTo) {
    return (
      <AuthShell title={t('register.sent_title')}>
        <div className="space-y-4">
          <p className="text-sm text-ink">{t('register.sent_body', { email: sentTo })}</p>
          <p className="text-sm text-ink-muted">{t('register.sent_spam')}</p>
          {resent ? (
            <Notice tone="info">{t('register.resent')}</Notice>
          ) : (
            <button type="button" className="btn-secondary min-h-11" onClick={resend}>
              {t('register.resend')}
            </button>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      wide
      title={t('register.title')}
     
      intro={
        <>
          <p>{t('register.intro')}</p>
          <p className="mt-2">
            {t('register.already_have_account')}{' '}
            <Link href="/login" className="font-medium text-terra-600 underline hover:text-terra-700">
              {t('register.login')}
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="full_name" className={fieldLabel}>
              {t('register.full_name_label')}
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              className="input-field min-h-11"
              value={form.full_name}
              onChange={set('full_name')}
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="email" className={fieldLabel}>
              {t('register.email_label')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              className="input-field min-h-11"
              placeholder={t('register.email_placeholder')}
              value={form.email}
              onChange={set('email')}
              disabled={sending}
            />
          </div>
        </div>

        <div>
          <label htmlFor="institution" className={fieldLabel}>
            {t('register.institution_label')}
          </label>
          <input
            id="institution"
            type="text"
            autoComplete="organization"
            required
            aria-required="true"
            className="input-field min-h-11"
            placeholder={t('register.institution_placeholder')}
            maxLength={200}
            value={form.institution}
            onChange={set('institution')}
            disabled={sending}
          />
        </div>

        <div>
          <label htmlFor="purpose" className={fieldLabel}>
            {t('register.purpose_label')}
          </label>
          <textarea
            id="purpose"
            required
            aria-required="true"
            aria-describedby="purpose-hint"
            className="input-field min-h-28"
            maxLength={PURPOSE_MAX}
            value={form.purpose}
            onChange={set('purpose')}
            disabled={sending}
          />
          <p id="purpose-hint" className={fieldHint}>
            {t('register.purpose_hint')}{' '}
            <span className="tabular-nums">
              {form.purpose.length}/{PURPOSE_MAX}
            </span>
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className={fieldLabel}>
              {t('register.password_label')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-describedby="password-hint"
              className="input-field min-h-11"
              value={form.password}
              onChange={set('password')}
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={fieldLabel}>
              {t('register.confirm_password_label')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              className="input-field min-h-11"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              disabled={sending}
            />
          </div>
        </div>
        <div>
          <p id="password-hint" className={fieldHint}>
            {t('register.password_hint')}
          </p>
          {form.password && (
            <div className="mt-2 flex items-center gap-3">
              <div
                className="h-1.5 flex-1 rounded-full bg-line"
                role="progressbar"
                aria-label={t('register.password_strength')}
                aria-valuenow={strength}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={strengthText || undefined}
              >
                <div className={`h-1.5 rounded-full ${strengthColor}`} style={{ width: `${strength}%` }} />
              </div>
              <span className="text-xs text-ink-muted">{strengthText}</span>
            </div>
          )}
        </div>

        {/* Left empty by people, filled by most bots; hidden from sight and from screen readers. */}
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
          <label htmlFor="website">{t('register.website_label')}</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={set('website')}
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            required
            aria-required="true"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={sending}
            className="mt-1 h-4 w-4 rounded border-line-strong text-terra-600 focus:ring-terra-600"
          />
          <label htmlFor="terms" className="text-sm text-ink">
            {t('register.agree_to')}{' '}
            <Link href="/terms" className="font-medium text-terra-600 underline hover:text-terra-700">
              {t('register.terms_of_service')}
            </Link>{' '}
            {t('register.and')}{' '}
            <Link href="/privacy" className="font-medium text-terra-600 underline hover:text-terra-700">
              {t('register.privacy_policy')}
            </Link>
          </label>
        </div>

        <button type="submit" disabled={sending} className="btn-primary min-h-11 w-full sm:w-auto">
          {sending ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
    </AuthShell>
  )
}
