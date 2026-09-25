'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from '@/navigation'
import { isLocale } from '@/config/i18n'
import { validateEmail } from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'
import { subscribeToNewsletter } from '@/services/newsletterApi'

interface NewsletterSignupProps {
  title?: string
  description?: string
  className?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Newsletter sign-up card (About pages). The address is stored on the UNICAMP
 * VM (services/newsletterApi, source "about").
 */
export default function NewsletterSignup({ title, description, className = '' }: NewsletterSignupProps) {
  const t = useTranslations('newsletter')
  const locale = useLocale()
  const validationMessage = useValidationMessage()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const resetLater = () =>
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 5000)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const problem = validateEmail(email)
    if (problem) {
      setStatus('error')
      setMessage(validationMessage(problem))
      return
    }

    setStatus('loading')
    const result = await subscribeToNewsletter(email.trim(), 'about', isLocale(locale) ? locale : 'pt-BR')
    if (result === 'subscribed') {
      setStatus('success')
      setMessage(t('success'))
      setEmail('')
    } else {
      setStatus('error')
      setMessage(t(`errors.${result}`))
    }
    resetLater()
  }

  const busy = status === 'loading' || status === 'success'

  return (
    <div className={`bg-gradient-to-br from-cp2b-lime-light to-green-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border border-cp2b-lime/30 dark:border-slate-700 ${className}`}>
      <div className="inline-flex p-3 rounded-xl bg-cp2b-green/10 mb-4">
        <Mail className="w-8 h-8 text-cp2b-green" aria-hidden="true" />
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title ?? t('title')}
      </h3>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {description ?? t('description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('email_label')}
          </label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email_placeholder')}
            disabled={busy}
            aria-invalid={status === 'error'}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            aria-describedby={message ? 'newsletter-message' : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full px-6 py-3 font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              {t('processing')}
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              {t('subscribed')}
            </>
          ) : (
            <>
              {t('submit')}
              <Mail className="w-5 h-5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {message && (
        <div
          id="newsletter-message"
          className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}
          role="alert"
        >
          {status === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t.rich('privacy', {
          privacy: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  )
}
