'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Cookie, Mail, CheckCircle2, X, Loader2 } from 'lucide-react'

interface ConsentPayload {
  consent: 'all' | 'essential'
  email?: string
  timestamp: string
}

const STORAGE_KEY = 'pilar2b-cookie-consent'

export default function CookieConsent() {
  const t = useTranslations('cookieConsent')
  const locale = useLocale()
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (SSR or private mode edge case)
    }
  }, [])

  function saveConsent(type: 'all' | 'essential', emailValue?: string) {
    try {
      const payload: ConsentPayload = {
        consent: type,
        timestamp: new Date().toISOString(),
        ...(emailValue ? { email: emailValue } : {}),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore write errors
    }
    setVisible(false)
  }

  async function handleAcceptAll() {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('loading')
      try {
        // TODO: Replace with actual newsletter API endpoint
        await new Promise((resolve) => setTimeout(resolve, 800))
        setEmailStatus('success')
        await new Promise((resolve) => setTimeout(resolve, 800))
      } catch {
        setEmailStatus('error')
      }
    }
    saveConsent('all', email || undefined)
  }

  function handleEssentialOnly() {
    saveConsent('essential')
  }

  if (!visible) return null

  const privacyHref = `/${locale}/privacy`

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-[150] p-4 sm:p-6"
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
                  href={privacyHref}
                  className="text-xs text-cp2b-green dark:text-cp2b-lime underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-cp2b-lime rounded"
                >
                  {t('privacyLink')}
                </Link>
                <span className="text-xs text-gray-400 dark:text-gray-500">
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
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      id="cookie-consent-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      disabled={emailStatus === 'loading' || emailStatus === 'success'}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50"
                    />
                  </div>
                </div>
                {emailStatus === 'success' && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('successMessage')}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptAll}
                  disabled={emailStatus === 'loading'}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
                >
                  {emailStatus === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('acceptAll')
                  )}
                </button>
                <button
                  onClick={handleEssentialOnly}
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
