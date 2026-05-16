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

  const unselected = OUTPUT_OPTIONS.filter(o => !selected.includes(o.key))
  const hasPreview = previewOutputs !== null

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 text-center">{t('step4.instructions')}</p>

      {/* Selected outputs */}
      <div className="grid grid-cols-1 gap-3">
        {OUTPUT_OPTIONS.filter(o => selected.includes(o.key)).map(({ key, emoji, labelKey, descKey }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all border-green-500 bg-green-50"
          >
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-green-800">{t(`step4.${labelKey}`)}</p>
              <p className="text-xs text-gray-500 truncate">{t(`step4.${descKey}`)}</p>
              {hasPreview && (
                <p className="text-xs text-green-700 font-medium mt-0.5">
                  {fmtPreview(key, previewOutputs!)}
                </p>
              )}
            </div>
            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center border-green-500 bg-green-500">
              <span className="text-white text-xs">✓</span>
            </div>
          </button>
        ))}

        {/* Unselected outputs — main toggleable list */}
        {OUTPUT_OPTIONS.filter(o => !selected.includes(o.key)).map(({ key, emoji, labelKey, descKey }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all border-gray-200 bg-white hover:border-gray-300"
          >
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-700">{t(`step4.${labelKey}`)}</p>
              <p className="text-xs text-gray-500 truncate">{t(`step4.${descKey}`)}</p>
              {hasPreview && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtPreviewRange(key, previewOutputs!)}
                </p>
              )}
            </div>
            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center border-gray-300">
            </div>
          </button>
        ))}
      </div>

      {/* "Também calculado" info box — shown when there are unselected outputs with preview */}
      {hasPreview && unselected.length > 0 && (
        <p className="text-xs text-center text-gray-400">
          💡 Os valores acima (Básico – Ideal – Avançado) são calculados mesmo sem seleção e aparecem nos resultados em destaque reduzido.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← {t('common.back')}
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors
            bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {t('step4.calculate')} 🔬
        </button>
      </div>
    </div>
  )
}
