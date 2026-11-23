'use client'

/**
 * The link in the confirmation e-mail lands here. Opening it confirms the
 * address and sends the request to the CP2B team; a second visit says where
 * the request stands.
 */
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import AuthShell from '@/components/auth/AuthShell'
import { AuthError, type AuthErrorCode } from '@/lib/authErrors'
import { verifyEmail, type AccountStatus } from '@/lib/api/accessClient'

type Outcome =
  | { kind: 'checking' }
  | { kind: 'status'; status: AccountStatus }
  | { kind: 'invalid' }
  | { kind: 'missing' }
  | { kind: 'failed'; code: AuthErrorCode }

function VerifyEmail() {
  const t = useTranslations('auth')
  const token = useSearchParams().get('token')
  const [outcome, setOutcome] = useState<Outcome>(token ? { kind: 'checking' } : { kind: 'missing' })
  // One request per visit: the link is single use, and React may run effects twice in development.
  const asked = useRef(false)

  useEffect(() => {
    if (!token || asked.current) return
    asked.current = true
    verifyEmail(token).then(
      (status) => setOutcome({ kind: 'status', status }),
      (err: unknown) => {
        const code = err instanceof AuthError ? err.code : 'access_failed'
        setOutcome(code === 'invalid_token' ? { kind: 'invalid' } : { kind: 'failed', code })
      }
    )
  }, [token])

  const link = 'font-medium text-terra-600 underline hover:text-terra-700'
  let title = t('verify.title')
  let body: React.ReactNode = <p role="status">{t('verify.checking')}</p>

  if (outcome.kind === 'missing' || outcome.kind === 'invalid') {
    title = t('verify.invalid_title')
    body = (
      <div className="space-y-4">
        <p>{t(outcome.kind === 'missing' ? 'verify.missing_body' : 'verify.invalid_body')}</p>
        <Link href="/register" className={link}>{t('verify.request_again')}</Link>
      </div>
    )
  } else if (outcome.kind === 'failed') {
    body = <p role="alert">{t(`errors.${outcome.code}`)}</p>
  } else if (outcome.kind === 'status') {
    const s = outcome.status
    if (s === 'approved') {
      title = t('verify.approved_title')
      body = (
        <div className="space-y-4">
          <p>{t('verify.approved_body')}</p>
          <Link href="/login" className="btn-primary min-h-11">{t('verify.go_login')}</Link>
        </div>
      )
    } else if (s === 'rejected') {
      title = t('verify.rejected_title')
      body = <p>{t('verify.rejected_body')}</p>
    } else {
      title = t('verify.review_title')
      body = (
        <div className="space-y-4">
          <p>{t('verify.review_body')}</p>
          <Link href="/" className={link}>{t('verify.go_home')}</Link>
        </div>
      )
    }
  }

  return (
    <AuthShell title={title}>
      <div className="text-sm text-ink" aria-live="polite">
        {body}
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  )
}
