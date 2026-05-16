'use client'

import { useTranslations } from 'next-intl'
import type { OutputType } from '../calculatorEngine'
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


export default function StepOutputs({ selected, onChange, onNext, onBack, previewOutputs }: Props) {
  const t = useTranslations('calculator')

  function toggle(key: OutputType) {
    if (selected.includes(key)) {
      const next = selected.filter(k => k !== key)
      if (next.length > 0) onChange(next)
    } else {
      onChange([...selected, key])
    }
  }

  const hasPreview = previewOutputs !== null

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-slate-400 text-center">{t('step4.instructions')}</p>

      {/* All output cards — flat list, click to toggle */}
      <div className="space-y-2">
        {OUTPUT_OPTIONS.map(({ key, emoji, labelKey, descKey }) => {
          const active = selected.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                ${active
                  ? 'border-green-500 dark:border-emerald-500 bg-green-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'}`}
            >
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${active ? 'text-green-800 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>
                  {t(`step4.${labelKey}`)}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t(`step4.${descKey}`)}</p>
                {hasPreview && active && (
                  <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-0.5">
                    {fmtPreview(key, previewOutputs!)}
                  </p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                ${active
                  ? 'border-green-500 dark:border-emerald-500 bg-green-500 dark:bg-emerald-500'
                  : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                {active && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          )
        })}
      </div>

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
