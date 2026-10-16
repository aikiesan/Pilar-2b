'use client'

/**
 * Registration Page for PILAR-2b V3
 * WCAG 2.1 AA Compliant
 */
import { useState } from 'react'
import { Link, useRouter } from '@/navigation'
import Image from 'next/image'
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthError } from '@/lib/authErrors'
import { useTranslations } from 'next-intl'
import { AFTER_LOGIN_FALLBACK } from '@/lib/authRedirect'
import {
  firstError,
  passwordStrength as scorePassword,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'
import { withBasePath } from '@/lib/basePath'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading } = useAuth()
  const t = useTranslations('auth')
  const validationMessage = useValidationMessage()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)

  const handlePasswordChange = (password: string) => {
    setFormData((prev) => ({ ...prev, password }))
    setPasswordStrength(scorePassword(password))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation: the first problem, in field order.
    const problem = firstError(
      validateRequired(formData.full_name),
      validateEmail(formData.email),
      validatePassword(formData.password),
      validatePasswordConfirmation(formData.password, formData.confirmPassword)
    )
    if (problem) {
      setError(validationMessage(problem))
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      })
      // A new account starts on the map (the dashboard is retired).
      router.push(AFTER_LOGIN_FALLBACK)
    } catch (err: unknown) {
      setError(t(`errors.${err instanceof AuthError ? err.code : 'registration_failed'}`))
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500'
    if (passwordStrength < 70) return 'bg-yellow-500'
    return 'bg-terra-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength < 40) return t('register.password_weak')
    if (passwordStrength < 70) return t('register.password_medium')
    return t('register.password_strong')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-ink hover:text-terra-600 transition-colors focus:outline-none focus:ring-2 focus:ring-terra-600 focus:ring-offset-2 focus:ring-offset-paper rounded-lg"
            aria-label={t('register.back_to_home')}
          >
            <Image src={withBasePath('/images/cp2b-logo.svg')} unoptimized alt="PILAR-2b Logo" width={200} height={55} style={{ height: 'auto' }} priority />

          </Link>
          <h1 className="mt-6 text-4xl text-ink">
            {t('register.title')}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t('register.or')}{' '}
            <Link
              href="/login"
              className="font-medium text-terra-600 dark:text-terra-400 hover:text-terra-700 underline focus:outline-none focus:ring-2 focus:ring-terra-600 rounded"
            >
              {t('register.login_existing')}
            </Link>
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white shadow-2xl rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 border-l-4 border-red-400 p-4 rounded"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start">
                  <AlertCircle
                    className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('register.full_name_label')}
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terra-800 dark:focus:ring-terra-500 focus:border-transparent transition-colors"
                placeholder={t('register.full_name_placeholder')}
                aria-required="true"
                aria-invalid={!!error}
                disabled={loading}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('register.email_label')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terra-800 dark:focus:ring-terra-500 focus:border-transparent transition-colors"
                placeholder={t('register.email_placeholder')}
                aria-required="true"
                aria-invalid={!!error}
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('register.password_label')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terra-800 dark:focus:ring-terra-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby="password-strength"
                disabled={loading}
              />

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2" id="password-strength" aria-live="polite">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {t('register.password_strength')}: <span className="font-medium">{getPasswordStrengthText()}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                      style={{ width: `${passwordStrength}%` }}
                      role="progressbar"
                      aria-label={t('register.password_strength')}
                      aria-valuetext={getPasswordStrengthText() || undefined}
                      aria-valuenow={passwordStrength}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('register.confirm_password_label')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terra-800 dark:focus:ring-terra-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!error}
                disabled={loading}
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-1 text-terra-800 focus:ring-terra-800 border-gray-300 rounded"
                aria-required="true"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                {t('register.agree_to')}{' '}
                <a
                  href="#"
                  className="font-medium text-terra-800 hover:text-ochre-600 underline"
                >
                  {t('register.terms_of_service')}
                </a>{' '}
                {t('register.and')}{' '}
                <a
                  href="#"
                  className="font-medium text-terra-800 hover:text-ochre-600 underline"
                >
                  {t('register.privacy_policy')}
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-terra-600 hover:bg-terra-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terra-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              aria-label={loading ? t('register.submitting') : t('register.submit')}
            >
              {loading ? (
                <>
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                    aria-hidden="true"
                  ></div>
                  <span>{t('register.submitting')}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  <span>{t('register.submit')}</span>
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
                  {t('register.already_have_account')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-3 px-4 border border-terra-800 text-base font-medium rounded-lg text-terra-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terra-800 transition-colors"
              >
                {t('register.login')}
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-ink-muted">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  )
}
