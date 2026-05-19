'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface NewsletterSignupProps {
  title?: string
  description?: string
  className?: string
  variant?: 'default' | 'compact' | 'inline'
}

/**
 * NewsletterSignup Component
 * Accessible form for newsletter subscriptions
 *
 * @param title - Heading text
 * @param description - Descriptive text
 * @param className - Additional CSS classes
 * @param variant - Layout variant (default, compact, inline)
 */
export default function NewsletterSignup({
  title = 'Fique por dentro das novidades',
  description = 'Receba atualizações sobre novos recursos, análises e insights sobre biogás.',
  className = '',
  variant = 'default'
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error')
      setMessage('Por favor, insira um email válido.')
      return
    }

    setStatus('loading')

    // Simulate API call (replace with actual API endpoint)
    try {
      // TODO: Replace with actual newsletter API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // For now, just show success
      setStatus('success')
      setMessage('Obrigado! Você receberá nossas atualizações em breve.')
      setEmail('')

      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)
    } catch (error) {
      setStatus('error')
      setMessage('Erro ao processar sua solicitação. Tente novamente.')

      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)
    }
  }

  // Compact variant (small, inline)
  if (variant === 'compact') {
    return (
      <div className={`${className}`}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label htmlFor="newsletter-email-compact" className="sr-only">
              Email
            </label>
            <input
              id="newsletter-email-compact"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={status === 'loading' || status === 'success'}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              aria-describedby={message ? 'newsletter-message-compact' : undefined}
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-6 py-2 text-sm font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
          >
            {status === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 inline" />
            ) : (
              'Assinar'
            )}
          </button>
        </form>
        {message && (
          <p
            id="newsletter-message-compact"
            className={`mt-2 text-xs ${
              status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
            role="alert"
          >
            {message}
          </p>
        )}
      </div>
    )
  }

  // Inline variant (text + input in one line)
  if (variant === 'inline') {
    return (
      <div className={`${className}`}>
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-cp2b-green flex-shrink-0" />
          <div className="flex-1">
            <label htmlFor="newsletter-email-inline" className="sr-only">
              Email
            </label>
            <input
              id="newsletter-email-inline"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu email"
              disabled={status === 'loading' || status === 'success'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              aria-describedby={message ? 'newsletter-message-inline' : undefined}
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-6 py-2 font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
          >
            {status === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Inscrito!
              </>
            ) : (
              'Inscrever'
            )}
          </button>
        </form>
        {message && (
          <p
            id="newsletter-message-inline"
            className={`mt-2 text-sm ${
              status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
            role="alert"
          >
            {message}
          </p>
        )}
      </div>
    )
  }

  // Default variant (full card with title and description)
  return (
    <div className={`bg-gradient-to-br from-cp2b-lime-light to-green-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border border-cp2b-lime/30 dark:border-slate-700 ${className}`}>
      {/* Icon */}
      <div className="inline-flex p-3 rounded-xl bg-cp2b-green/10 mb-4">
        <Mail className="w-8 h-8 text-cp2b-green" />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {description}
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Endereço de email
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={status === 'loading' || status === 'success'}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cp2b-lime bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            aria-describedby={message ? 'newsletter-message' : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full px-6 py-3 font-semibold text-white bg-cp2b-green hover:bg-cp2b-dark-green disabled:bg-gray-400 rounded-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processando...
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Inscrito com sucesso!
            </>
          ) : (
            <>
              Inscrever-se gratuitamente
              <Mail className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Status Message */}
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
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Privacy Note */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Respeitamos sua privacidade. Você pode cancelar a inscrição a qualquer momento.
      </p>
    </div>
  )
}
