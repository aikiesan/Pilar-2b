'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { firstError, validateConsent, validateEmail, validateRequired } from '@/lib/validation'
import { useValidationMessage } from '@/hooks/useValidationMessage'
import { fetchSpMunicipalities, type MunicipalityOption } from '../calculatorApi'

export interface IdentificacaoData {
  nome: string
  email: string
  municipality_id: number | null
  municipality_name: string
  consent_lgpd: boolean
}

interface Props {
  data: IdentificacaoData
  onChange: (d: IdentificacaoData) => void
  onNext: () => void
  onSkip?: () => void
}

export default function StepIdentificacao({ data, onChange, onNext, onSkip }: Props) {
  const t = useTranslations('calculator')
  const validationMessage = useValidationMessage()
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [munSearch, setMunSearch] = useState(data.municipality_name)
  const [loadingMun, setLoadingMun] = useState(true)
  const [munError, setMunError] = useState(false)

  useEffect(() => {
    fetchSpMunicipalities()
      .then(list => {
        setMunicipalities(list)
        setMunError(list.length === 0)
      })
      .finally(() => setLoadingMun(false))
  }, [])

  const set = (patch: Partial<IdentificacaoData>) => onChange({ ...data, ...patch })

  // The suggestions are a native <datalist>: typing filters them, and the
  // keyboard and screen readers can reach them (the previous hand-made list
  // answered only to the mouse). A municipality counts as chosen once the text
  // matches one of them exactly.
  function handleMunicipalityInput(value: string) {
    setMunSearch(value)
    const match = municipalities.find(
      m => m.municipality_name.localeCompare(value.trim(), 'pt-BR', { sensitivity: 'accent' }) === 0
    )
    set(match
      ? { municipality_id: match.id, municipality_name: match.municipality_name }
      : { municipality_id: null, municipality_name: '' })
  }

  // When the list could not be loaded the municipality is typed in, so a name
  // is enough — otherwise the form could never be completed.
  const municipalityProblem = munError
    ? validateRequired(data.municipality_name)
    : data.municipality_id === null ? 'required' as const : null
  const problem = firstError(
    validateRequired(data.nome),
    validateEmail(data.email),
    municipalityProblem,
    validateConsent(data.consent_lgpd),
  )
  const canAdvance = problem === null
  // Only the email is checked as the user types: the other fields are plainly
  // empty or filled, while a malformed address deserves saying why.
  const emailProblem = data.email.trim() !== '' ? validateEmail(data.email) : null

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="calc-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.nome')} <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="calc-name"
          required
          autoComplete="name"
          type="text"
          value={data.nome}
          onChange={e => set({ nome: e.target.value })}
          placeholder={t('step1.nomePlaceholder')}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="calc-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.email')} <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="calc-email"
          required
          autoComplete="email"
          type="email"
          value={data.email}
          onChange={e => set({ email: e.target.value })}
          placeholder={t('step1.emailPlaceholder')}
          aria-invalid={emailProblem !== null}
          aria-describedby={emailProblem ? 'calc-email-error' : undefined}
          className="input-field"
        />
        {emailProblem && (
          <p id="calc-email-error" className="text-xs text-red-600 dark:text-red-400 mt-1">
            {validationMessage(emailProblem)}
          </p>
        )}
      </div>

      <div className="relative">
        <label htmlFor="calc-municipality" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.municipio')} <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        {munError ? (
          <>
          <input
            id="calc-municipality"
            required
            aria-describedby="calc-municipality-note"
            type="text"
            value={munSearch}
            onChange={e => {
              setMunSearch(e.target.value)
              set({ municipality_id: null, municipality_name: e.target.value })
            }}
            placeholder={t('step1.municipioManualPlaceholder')}
            className="w-full border border-amber-300 dark:border-amber-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <p id="calc-municipality-note" className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            {t('step1.municipioListUnavailable')}
          </p>
          </>
        ) : (
          <>
            <input
              id="calc-municipality"
              required
              type="text"
              list="calc-municipality-options"
              value={munSearch}
              onChange={e => handleMunicipalityInput(e.target.value)}
              placeholder={loadingMun ? t('step1.municipioLoading') : t('step1.municipioPlaceholder')}
              autoComplete="off"
              disabled={loadingMun}
              className="input-field disabled:opacity-60"
            />
            <datalist id="calc-municipality-options">
              {municipalities.map(m => (
                <option key={m.id} value={m.municipality_name} />
              ))}
            </datalist>
          </>
        )}
        {data.municipality_id && (
          <p className="text-xs text-green-600 mt-1">✓ {data.municipality_name}</p>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
        <input
          id="lgpd"
          type="checkbox"
          checked={data.consent_lgpd}
          onChange={e => set({ consent_lgpd: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-green-600"
        />
        <label htmlFor="lgpd" className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
          {t('step1.lgpdConsent')}
        </label>
      </div>

      <button
        onClick={onNext}
        disabled={!canAdvance}
        className="w-full py-3 rounded-xl font-semibold text-white transition-colors
          bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        {t('common.next')} →
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          {t('common.skip')}
        </button>
      )}
    </div>
  )
}
