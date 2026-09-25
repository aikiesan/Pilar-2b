'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle2, Cookie, Loader2, Mail } from 'lucide-react'
import { Link } from '@/navigation'
import { isLocale } from '@/config/i18n'
import {
  onConsentChange,
  onOpenConsentPreferences,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from '@/lib/consent'
import { validateEmail } from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'
import { subscribeToNewsletter } from '@/services/newsletterApi'

type EmailStatus = 'idle' | 'loading' | 'success' | 'error'

// Unknown on the server: the banner renders only in the browser, where the
// stored choice can be read, so it never flashes for someone who has chosen.
const unknownOnTheServer = () => undefined

/**
 * The cookie banner: shown until the visitor chooses, and again from the
 * footer's "Cookie preferences". "Accept all" allows the statistics cookie
 * (lib/analytics); "Essential only" refuses it. The newsletter field is a
 * separate consent: an address typed there is subscribed whichever button is
 * pressed, and nothing is subscribed when it is left empty.
 */
export default function CookieConsent() {
  const t = useTranslations('cookieConsent')
  const tNewsletter = useTranslations('newsletter')
  const locale = useLocale()
  const validationMessage = useValidationMessage()
  const consent = useSyncExternalStore(onConsentChange, readConsent, unknownOnTheServer)
  const [reopened, setReopened] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => onOpenConsentPreferences(() => setReopened(true)), [])

  if (consent !== null && !reopened) return null

  async function subscribeIfAsked(): Promise<boolean> {
    const address = email.trim()
    if (!address || emailStatus === 'success') return true
    const problem = validateEmail(address)
    if (problem) {
      setEmailStatus('error')
      setEmailError(validationMessage(problem))
      return false
    }
    setEmailStatus('loading')
    setEmailError(null)
    const result = await subscribeToNewsletter(address, 'cookie_banner', isLocale(locale) ? locale : 'pt-BR')
    if (result !== 'subscribed') {
      setEmailStatus('error')
      setEmailError(tNewsletter(`errors.${result}`))
      return false
    }
    setEmailStatus('success')
    // Let the confirmation be read before the banner closes.
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return true
  }

  async function choose(choice: ConsentChoice) {
    if (!(await subscribeIfAsked())) return
    saveConsent(choice)
    setReopened(false)
  }

  const busy = emailStatus === 'loading'

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-[500] p-4 sm:p-6"
    >
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cp2b-green via-cp2b-lime to-cp2b-green" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Cookie className="w-5 h-5 text-cp2b-green flex-shrink-0" />
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {t('title')}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                {t('description')}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/privacy"
                  className="text-xs text-cp2b-green dark:text-cp2b-lime underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-cp2b-lime rounded"
                >
                  {t('privacyLink')}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('lgpdNote')}
                </span>
              </div>
            </div>

            {/* Right: Email + buttons */}
            <div className="flex flex-col gap-3 lg:w-80 flex-shrink-0">
              {/* Newsletter email input */}
              <div>
                <label
                  htmlFor="cookie-consent-email"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t('emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    id="cookie-consent-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailStatus('idle')
                      setEmailError(null)
                    }}
                    placeholder={t('emailPlaceholder')}
                    disabled={busy || emailStatus === 'success'}
                    aria-invalid={emailStatus === 'error'}
                    aria-describedby="cookie-consent-email-status"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50"
                  />
                </div>
                <div id="cookie-consent-email-status" aria-live="polite">
                  {emailStatus === 'success' && (
                    <p className="mt-1 text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('successMessage')}
                    </p>
                  )}
                  {emailStatus === 'error' && emailError && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => choose('all')}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('acceptAll')}
                </button>
                <button
                  onClick={() => choose('essential')}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
                >
                  {t('essentialOnly')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
