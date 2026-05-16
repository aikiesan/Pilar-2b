'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { fetchSpMunicipalities, type MunicipalityOption } from '../calculatorApi'

export interface IdentificacaoData {
  nome: string
  email: string
  cpf_cnpj: string
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
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [munSearch, setMunSearch] = useState(data.municipality_name)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingMun, setLoadingMun] = useState(true)
  const [munError, setMunError] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchSpMunicipalities()
      .then(list => {
        setMunicipalities(list)
        setMunError(list.length === 0)
      })
      .finally(() => setLoadingMun(false))
  }, [])

  const filtered = munSearch.length >= 2
    ? municipalities.filter(m => m.municipality_name.toLowerCase().includes(munSearch.toLowerCase())).slice(0, 10)
    : municipalities.slice(0, 10)

  const set = (patch: Partial<IdentificacaoData>) => onChange({ ...data, ...patch })

  const canAdvance = data.nome.trim() !== ''
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    && data.municipality_id !== null
    && data.consent_lgpd

  function handleMunBlur() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setShowDropdown(false), 200)
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.nome')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.nome}
          onChange={e => set({ nome: e.target.value })}
          placeholder={t('step1.nomePlaceholder')}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.email')} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={e => set({ email: e.target.value })}
          placeholder="seu@email.com.br"
          className="input-field"
        />
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.municipio')} <span className="text-red-500">*</span>
        </label>
        {munError ? (
          <input
            type="text"
            value={munSearch}
            onChange={e => {
              setMunSearch(e.target.value)
              set({ municipality_id: null, municipality_name: e.target.value })
            }}
            placeholder="Digite o nome do município"
            className="w-full border border-amber-300 dark:border-amber-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        ) : (
          <>
            <input
              type="text"
              value={munSearch}
              onChange={e => {
                setMunSearch(e.target.value)
                setShowDropdown(true)
                if (!e.target.value) set({ municipality_id: null, municipality_name: '' })
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={handleMunBlur}
              placeholder={loadingMun ? 'Carregando municípios…' : t('step1.municipioPlaceholder')}
              autoComplete="off"
              disabled={loadingMun}
              className="input-field disabled:opacity-60"
            />
            {showDropdown && filtered.length > 0 && !loadingMun && (
              <ul className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-slate-900/50 mt-1 max-h-52 overflow-y-auto">
                {filtered.map(m => (
                  <li
                    key={m.id}
                    onMouseDown={() => {
                      set({ municipality_id: m.id, municipality_name: m.municipality_name })
                      setMunSearch(m.municipality_name)
                      setShowDropdown(false)
                    }}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer hover:bg-green-50 dark:hover:bg-emerald-900/30"
                  >
                    {m.municipality_name}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {data.municipality_id && (
          <p className="text-xs text-green-600 mt-1">✓ {data.municipality_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          {t('step1.cpfCnpj')} <span className="text-gray-400 dark:text-slate-500 text-xs">({t('common.optional')})</span>
        </label>
        <input
          type="text"
          value={data.cpf_cnpj}
          onChange={e => set({ cpf_cnpj: e.target.value })}
          placeholder="CPF ou CNPJ"
          className="input-field"
        />
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('step1.cpfNote')}</p>
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
