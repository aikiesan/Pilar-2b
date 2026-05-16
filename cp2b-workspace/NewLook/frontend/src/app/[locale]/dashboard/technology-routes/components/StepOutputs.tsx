'use client'

import { useTranslations } from 'next-intl'
import type { OutputType, ActivityType } from '../calculatorEngine'
import type { OutputResult } from '../calculatorEngine'

const OUTPUT_OPTIONS: { key: OutputType; emoji: string; labelKey: string; descKey: string }[] = [
  { key: 'energy',     emoji: '⚡', labelKey: 'energy',     descKey: 'energyDesc'     },
  { key: 'biomethane', emoji: '⛽', labelKey: 'biomethane', descKey: 'biomethaneDesc' },
  { key: 'digestate',  emoji: '🌱', labelKey: 'digestate',  descKey: 'digestateDesc'  },
  { key: 'thermal',    emoji: '🔥', labelKey: 'thermal',    descKey: 'thermalDesc'    },
  { key: 'biochar',    emoji: '🪨', labelKey: 'biochar',    descKey: 'biocharDesc'    },
  { key: 'carbon',     emoji: '🌍', labelKey: 'carbon',     descKey: 'carbonDesc'     },
]

interface Props {
  selected: OutputType[]
  onChange: (s: OutputType[]) => void
  onNext: () => void
  onBack: () => void
  activityType: ActivityType | null
  previewOutputs: OutputResult | null
}

function fmtPreview(type: OutputType, outputs: OutputResult): string {
  const f = (n: number, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d })
  switch (type) {
    case 'energy':     return `${f(outputs.energyKwhYear / 1000, 1)} MWh/ano`
    case 'biomethane': return `${f(outputs.biomethaneM3Year)} m³/ano`
    case 'digestate':  return `${f(outputs.digestateTonsYear)} t/ano`
    case 'thermal':    return `${f(outputs.thermalMjYear / 1000)} GJ/ano`
    case 'biochar':    return `${f(outputs.biocharTonsYear, 1)} t/ano`
    case 'carbon':     return `${f(outputs.co2TonsYear, 1)} tCO₂eq`
  }
}

function fmtPreviewRange(type: OutputType, outputs: OutputResult): string {
  const f = (n: number, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d })
  switch (type) {
    case 'energy': {
      const avg = outputs.energyKwhYear / 1000
      return `${f(avg * 0.75, 1)} – ${f(avg, 1)} – ${f(avg * 1.35, 1)} MWh/ano`
    }
    case 'biomethane': {
      const avg = outputs.biomethaneM3Year
      return `${f(avg * 0.75)} – ${f(avg)} – ${f(avg * 1.35)} m³/ano`
    }
    case 'digestate': {
      const avg = outputs.digestateTonsYear
      return `${f(avg * 0.75)} – ${f(avg)} – ${f(avg * 1.35)} t/ano`
    }
    case 'thermal': {
      const avg = outputs.thermalMjYear / 1000
      return `${f(avg * 0.75)} – ${f(avg)} – ${f(avg * 1.35)} GJ/ano`
    }
    case 'biochar': {
      const avg = outputs.biocharTonsYear
      return `${f(avg * 0.75, 1)} – ${f(avg, 1)} – ${f(avg * 1.35, 1)} t/ano`
    }
    case 'carbon': {
      const avg = outputs.co2TonsYear
      return `${f(avg * 0.75, 1)} – ${f(avg, 1)} – ${f(avg * 1.35, 1)} tCO₂eq`
    }
  }
}

export default function StepOutputs({ selected, onChange, onNext, onBack, activityType, previewOutputs }: Props) {
  const t = useTranslations('calculator')

  function toggle(key: OutputType) {
    if (selected.includes(key)) {
      const next = selected.filter(k => k !== key)
      if (next.length > 0) onChange(next)
    } else {
      onChange([...selected, key])
    }
  }

  const selectedOptions = OUTPUT_OPTIONS.filter(o => selected.includes(o.key))
  const unselectedOptions = OUTPUT_OPTIONS.filter(o => !selected.includes(o.key))
  const hasPreview = previewOutputs !== null

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-slate-400 text-center">{t('step4.instructions')}</p>

      {/* Selected outputs */}
      {selectedOptions.length > 0 && (
        <div className="space-y-2">
          {selectedOptions.map(({ key, emoji, labelKey, descKey }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                         border-green-500 dark:border-emerald-500 bg-green-50 dark:bg-emerald-900/20"
            >
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-green-800 dark:text-emerald-300">{t(`step4.${labelKey}`)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t(`step4.${descKey}`)}</p>
                {hasPreview && (
                  <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-0.5">
                    {fmtPreview(key, previewOutputs!)}
                  </p>
                )}
              </div>
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                              border-green-500 dark:border-emerald-500 bg-green-500 dark:bg-emerald-500">
                <span className="text-white text-xs">✓</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* "Também calculado" — collapsible accordion for non-selected outputs */}
      {unselectedOptions.length > 0 && (
        <details className="group border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none
                              bg-gray-50 dark:bg-slate-800/60
                              hover:bg-gray-100 dark:hover:bg-slate-700/60
                              transition-colors">
            <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
              📊 Também calculado
              <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">
                ({unselectedOptions.length} não selecionado{unselectedOptions.length > 1 ? 's' : ''})
              </span>
            </span>
            <span className="text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform text-xs">▼</span>
          </summary>

          <div className="px-4 py-3 space-y-2 bg-white dark:bg-slate-900">
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
              Valores estimados para cenários Básico – Ideal – Avançado. Clique em "+ Adicionar" para incluir no plano.
            </p>
            {unselectedOptions.map(({ key, emoji, labelKey, descKey }) => (
              <div
                key={key}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
              >
                <span className="text-xl shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-600 dark:text-slate-400">{t(`step4.${labelKey}`)}</p>
                  {hasPreview ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {fmtPreviewRange(key, previewOutputs!)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{t(`step4.${descKey}`)}</p>
                  )}
                </div>
                <button
                  onClick={() => onChange([...selected, key])}
                  className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg
                             text-green-700 dark:text-emerald-400
                             border border-green-300 dark:border-emerald-700
                             hover:bg-green-50 dark:hover:bg-emerald-900/30
                             transition-colors"
                >
                  + Adicionar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300
                     border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-800
                     hover:bg-gray-50 dark:hover:bg-slate-700
                     transition-colors"
        >
          ← {t('common.back')}
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors
            bg-green-600 dark:bg-emerald-600 hover:bg-green-700 dark:hover:bg-emerald-700
            disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {t('step4.calculate')} 🔬
        </button>
      </div>
    </div>
  )
}
