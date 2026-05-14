'use client'

import { useTranslations } from 'next-intl'
import type { OutputType } from '../calculatorEngine'

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
}

export default function StepOutputs({ selected, onChange, onNext, onBack }: Props) {
  const t = useTranslations('calculator')

  function toggle(key: OutputType) {
    if (selected.includes(key)) {
      const next = selected.filter(k => k !== key)
      if (next.length > 0) onChange(next)  // at least 1 selected
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 text-center">{t('step4.instructions')}</p>

      <div className="grid grid-cols-1 gap-3">
        {OUTPUT_OPTIONS.map(({ key, emoji, labelKey, descKey }) => {
          const active = selected.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                ${active
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <span className="text-2xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${active ? 'text-green-800' : 'text-gray-700'}`}>
                  {t(`step4.${labelKey}`)}
                </p>
                <p className="text-xs text-gray-500 truncate">{t(`step4.${descKey}`)}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                ${active ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                {active && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          )
        })}
      </div>

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
