'use client'

/**
 * Login Page for PILAR-2b V3
 * WCAG 2.1 AA Compliant
 */
import { useState, useEffect } from 'react'
import { Link, useRouter } from '@/navigation'
import Image from 'next/image'
import { LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/types/errors'
import { useTranslations } from 'next-intl'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const router = useRouter()
  const { login, loading, user } = useAuth()
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shouldNavigate, setShouldNavigate] = useState(false)

  // Navigate to dashboard once user is loaded after login
  useEffect(() => {
    if (shouldNavigate && user && !loading) {
      logger.info('[Login] User loaded, navigating to dashboard')
      router.push('/dashboard')
      setShouldNavigate(false)
    }
  }, [shouldNavigate, user, loading, router])

  // Safety timeout: if user doesn't load within 8 seconds, navigate anyway
  useEffect(() => {
    if (shouldNavigate && !user) {
      const timeoutId = setTimeout(() => {
        logger.warn('[Login] User profile timeout after 8s, forcing navigation')
        router.push('/dashboard')
        setShouldNavigate(false)
      }, 8000)

      return () => clearTimeout(timeoutId)
    }
  }, [shouldNavigate, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Client-side validation
    if (!email || !password) {
      setError(t('errors.fill_all_fields'))
      setIsSubmitting(false)
      return
    }

    try {
      await login({ email, password })
      // Signal that we should navigate once user is loaded
      setShouldNavigate(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('errors.login_failed'))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cp2b-primary via-cp2b-secondary to-green-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-cp2b-primary rounded-lg"
            aria-label={t('login.back_to_home')}
          >
            <Image
              src="/pilar2b/images/logotipo-full-black.png"
              alt="PILAR-2b Logo"
              width={180}
              height={50}
              style={{ height: 'auto' }}
              className="brightness-0 invert mb-6"
              priority
            />
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold text-white">
            {t('login.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-200">
            {t('login.or')}{' '}
            <Link
              href="/register"
              className="font-medium text-cp2b-accent hover:text-yellow-300 underline focus:outline-none focus:ring-2 focus:ring-cp2b-accent rounded"
            >
              {t('login.create_account')}
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-slate-800 shadow-2xl dark:shadow-dark-lg rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500 p-4 rounded"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start">
                  <AlertCircle
                    className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('login.email_label')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cp2b-primary dark:focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder={t('login.email_placeholder')}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('login.password_label')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cp2b-primary dark:focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!error}
                disabled={isSubmitting || loading}
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-cp2b-primary dark:text-emerald-500 focus:ring-cp2b-primary dark:focus:ring-emerald-500 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  {t('login.remember_me')}
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-cp2b-primary dark:text-emerald-400 hover:text-cp2b-secondary dark:hover:text-emerald-300 underline focus:outline-none focus:ring-2 focus:ring-cp2b-primary dark:focus:ring-emerald-500 rounded"
                >
                  {t('login.forgot_password')}
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-cp2b-primary hover:bg-cp2b-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              aria-label={isSubmitting ? t('login.submitting') : t('login.submit')}
            >
              {isSubmitting ? (
                <>
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                    aria-hidden="true"
                  ></div>
                  <span>{t('login.submitting')}</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  <span>{t('login.submit')}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('login.new_to_platform')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/register"
                className="w-full flex justify-center py-3 px-4 border border-cp2b-primary text-base font-medium rounded-lg text-cp2b-primary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-primary transition-colors"
              >
                {t('login.create_new_account')}
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-200">
          {t('common.copyright')}
        </p>
      </div>
    </div>
  )
}
