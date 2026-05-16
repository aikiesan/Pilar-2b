'use client'

import { useTranslations } from 'next-intl'
import type { ActivityType, LivestockSpecies, CropType } from '../calculatorEngine'
import { hectaresToCane, CROP_PARAMS, SUGARCANE_STREAMS, LIVESTOCK_PPB } from '../calculatorEngine'

export interface AtividadeData {
  activityType: ActivityType | null
  sugarcaneType: 'tons' | 'hectares'
  sugarcaneValue: number
  livestockHeads: Partial<Record<LivestockSpecies, number>>
  cropTonnes: number
}

interface Props {
  data: AtividadeData
  onChange: (d: AtividadeData) => void
  onNext: () => void
  onBack: () => void
}

const LIVESTOCK_SPECIES: { key: LivestockSpecies; emoji: string; labelKey: string }[] = [
  { key: 'swine',        emoji: '🐖', labelKey: 'suinos' },
  { key: 'cattle_beef',  emoji: '🐄', labelKey: 'bovinosCorte' },
  { key: 'cattle_dairy', emoji: '🥛', labelKey: 'bovinosLeite' },
  { key: 'poultry_eggs', emoji: '🥚', labelKey: 'galPostura' },
  { key: 'poultry_meat', emoji: '🍗', labelKey: 'galCorte' },
]

const ACTIVITY_OPTIONS: { key: ActivityType; emoji: string; labelKey: string; descKey: string }[] = [
  { key: 'sugarcane', emoji: '🌾', labelKey: 'sugarcane',  descKey: 'sugarcaneDesc'  },
  { key: 'corn',      emoji: '🌽', labelKey: 'corn',       descKey: 'cornDesc'       },
  { key: 'soy',       emoji: '🌿', labelKey: 'soy',        descKey: 'soyDesc'        },
  { key: 'coffee',    emoji: '☕', labelKey: 'coffee',     descKey: 'coffeeDesc'     },
  { key: 'citrus',    emoji: '🍊', labelKey: 'citrus',     descKey: 'citrusDesc'     },
  { key: 'livestock', emoji: '🐄', labelKey: 'livestock',  descKey: 'livestockDesc'  },
]

const CROP_TYPES: CropType[] = ['corn', 'soy', 'coffee', 'citrus']

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

// ── Residue Breakdown Panels ─────────────────────────────────────────────────

const STREAM_LABELS: Record<keyof typeof SUGARCANE_STREAMS, { label: string; emoji: string; note: string }> = {
  bagaco:  { label: 'Bagaço',        emoji: '🟫', note: `${(SUGARCANE_STREAMS.bagaco.fde * 100).toFixed(0)}% disponível p/ biogás (resto: cogeração)` },
  palha:   { label: 'Palha / Palhiço', emoji: '🟡', note: `${(SUGARCANE_STREAMS.palha.fde * 100).toFixed(0)}% disponível p/ biogás (resto: cobertura do solo)` },
  vinhaca: { label: 'Vinhaça',       emoji: '🟤', note: `${(SUGARCANE_STREAMS.vinhaca.fde * 100).toFixed(0)}% disponível p/ biogás (10% fertirrigação obrigatória)` },
  torta:   { label: 'Torta de filtro', emoji: '⚫', note: `${(SUGARCANE_STREAMS.torta.fde * 100).toFixed(0)}% disponível p/ biogás (resto: adubo)` },
}

function SugarcaneBreakdown({ tonsRaw }: { tonsRaw: number }) {
  if (tonsRaw <= 0) return null
  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
      <p className="text-xs font-semibold text-amber-800 mb-2">📦 Resíduos gerados pelo seu processo:</p>
      {(Object.entries(SUGARCANE_STREAMS) as [keyof typeof SUGARCANE_STREAMS, typeof SUGARCANE_STREAMS[keyof typeof SUGARCANE_STREAMS]][]).map(([key, s]) => {
        const total = tonsRaw * s.rpr
        const available = total * s.fde
        const meta = STREAM_LABELS[key]
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">{meta.label}</span>
                <span className="font-semibold text-amber-700">{fmt(total)} t geradas</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span className="italic">{meta.note}</span>
                <span className="text-green-700 font-medium">→ {fmt(available)} t p/ biogás</span>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 pt-1 border-t border-amber-100 mt-2">
        Total resíduos gerados: <strong>{fmt(Object.values(SUGARCANE_STREAMS).reduce((s, r) => s + tonsRaw * r.rpr, 0))} t/ano</strong> •
        Para biogás: <strong>{fmt(Object.values(SUGARCANE_STREAMS).reduce((s, r) => s + tonsRaw * r.rpr * r.fde, 0))} t/ano</strong>
      </p>
    </div>
  )
}

const LIVESTOCK_LABELS: Record<LivestockSpecies, { label: string; emoji: string; manureM3: number }> = {
  swine:          { label: 'Suínos',             emoji: '🐖', manureM3: 3.5  },
  cattle_beef:    { label: 'Bovinos de Corte',   emoji: '🐄', manureM3: 10.0 },
  cattle_dairy:   { label: 'Bovinos de Leite',   emoji: '🥛', manureM3: 14.0 },
  poultry_eggs:   { label: 'Galináceos Postura', emoji: '🥚', manureM3: 0.04 },
  poultry_meat:   { label: 'Galináceos Corte',   emoji: '🍗', manureM3: 0.02 },
}

function LivestockBreakdown({ heads }: { heads: Partial<Record<LivestockSpecies, number>> }) {
  const entries = (Object.entries(heads) as [LivestockSpecies, number][]).filter(([, v]) => v > 0)
  if (entries.length === 0) return null
  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-amber-800 mb-2">📦 Estimativa de resíduos do seu rebanho:</p>
      {entries.map(([species, count]) => {
        const meta = LIVESTOCK_LABELS[species]
        const ppb = LIVESTOCK_PPB[species]
        const manureTotal = count * meta.manureM3
        const biogasYear = count * ppb.ppb
        return (
          <div key={species} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">{meta.label} — {fmt(count)} cabeças</span>
                <span className="font-semibold text-amber-700">≈ {fmt(manureTotal)} m³ esterco/ano</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span className="italic">Potencial (PPB)</span>
                <span className="text-green-700 font-medium">→ {fmt(biogasYear)} m³ biogás/ano</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CropBreakdown({ cropType, tonnes }: { cropType: CropType; tonnes: number }) {
  if (tonnes <= 0) return null
  const p = CROP_PARAMS[cropType]
  const available = tonnes * p.avail
  const notUsed = tonnes - available
  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
      <p className="text-xs font-semibold text-amber-800 mb-2">📦 Estimativa de resíduo gerado:</p>
      <div className="flex justify-between">
        <span className="text-gray-600">Total de resíduo informado</span>
        <span className="font-semibold text-gray-800">{fmt(tonnes)} t/ano</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Disponível para biodigestor ({(p.avail * 100).toFixed(0)}%)</span>
        <span className="font-semibold text-green-700">{fmt(available)} t/ano</span>
      </div>
      <div className="flex justify-between text-gray-400">
        <span>Outros usos / perdas ({(100 - p.avail * 100).toFixed(0)}%)</span>
        <span>{fmt(notUsed)} t/ano</span>
      </div>
      <div className="flex justify-between border-t border-amber-100 pt-1 mt-1">
        <span className="text-gray-500">Sólidos Voláteis (SV) disponíveis</span>
        <span className="font-medium text-gray-700">{fmt(available * p.vs)} t SV/ano</span>
      </div>
      <p className="text-gray-400 pt-1">Fonte dos parâmetros: {p.source}</p>
    </div>
  )
}

export default function StepAtividade({ data, onChange, onNext, onBack }: Props) {
  const t = useTranslations('calculator')
  const set = (patch: Partial<AtividadeData>) => onChange({ ...data, ...patch })

  const isSugarcane = data.activityType === 'sugarcane'
  const isLivestock = data.activityType === 'livestock'
  const isCrop = data.activityType !== null && CROP_TYPES.includes(data.activityType as CropType)

  const totalHeads = Object.values(data.livestockHeads).reduce((s, v) => s + (v ?? 0), 0)

  const canAdvance = (() => {
    if (isSugarcane) return data.sugarcaneValue > 0
    if (isLivestock) return totalHeads > 0
    if (isCrop)      return data.cropTonnes > 0
    return false
  })()

  const caneHint = data.sugarcaneType === 'hectares' && data.sugarcaneValue > 0
    ? `≈ ${Math.round(hectaresToCane(data.sugarcaneValue)).toLocaleString('pt-BR')} t/ano`
    : null

  const cropLabel = isCrop && data.activityType
    ? CROP_PARAMS[data.activityType as CropType].descLabel
    : ''

  return (
    <div className="space-y-5">
      {/* Activity type selector grid */}
      {data.activityType === null && (
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_OPTIONS.map(({ key, emoji, labelKey, descKey }) => (
            <button
              key={key}
              onClick={() => set({ activityType: key })}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-200
                hover:border-green-400 hover:bg-green-50 transition-all text-center"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-800 text-sm">{t(`step2.${labelKey}`)}</span>
              <span className="text-xs text-gray-500 leading-tight">{t(`step2.${descKey}`)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sugarcane input */}
      {isSugarcane && (
        <div className="space-y-4">
          <button onClick={() => set({ activityType: null })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← {t('common.back')}
          </button>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <span className="text-2xl">🌾</span>
            <div>
              <p className="font-semibold text-gray-800">{t('step2.sugarcane')}</p>
              <p className="text-xs text-gray-500">{t('step2.sugarcaneDesc')}</p>
            </div>
          </div>

          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {(['tons', 'hectares'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => set({ sugarcaneType: opt, sugarcaneValue: 0 })}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${data.sugarcaneType === opt
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {opt === 'tons' ? t('step2.tons') : t('step2.hectares')}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {data.sugarcaneType === 'tons' ? t('step2.tonsLabel') : t('step2.hectaresLabel')}
            </label>
            <input
              type="number" min={0}
              value={data.sugarcaneValue || ''}
              onChange={e => set({ sugarcaneValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {caneHint && <p className="text-xs text-green-600 mt-1">📊 {caneHint}</p>}
          </div>

          <SugarcaneBreakdown
            tonsRaw={data.sugarcaneType === 'hectares'
              ? hectaresToCane(data.sugarcaneValue)
              : data.sugarcaneValue}
          />
        </div>
      )}

      {/* Generic crop input (corn, soy, coffee, citrus) */}
      {isCrop && (
        <div className="space-y-4">
          <button onClick={() => set({ activityType: null, cropTonnes: 0 })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← {t('common.back')}
          </button>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <span className="text-2xl">
              {ACTIVITY_OPTIONS.find(o => o.key === data.activityType)?.emoji}
            </span>
            <div>
              <p className="font-semibold text-gray-800">
                {data.activityType ? t(`step2.${data.activityType}`) : ''}
              </p>
              <p className="text-xs text-gray-500">{cropLabel}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('step2.cropTonnesLabel')}
            </label>
            <input
              type="number" min={0}
              value={data.cropTonnes || ''}
              onChange={e => set({ cropTonnes: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">{t('step2.cropTonnesHint')}</p>
          </div>

          {isCrop && data.activityType && (
            <CropBreakdown
              cropType={data.activityType as CropType}
              tonnes={data.cropTonnes}
            />
          )}
        </div>
      )}

      {/* Livestock input */}
      {isLivestock && (
        <div className="space-y-4">
          <button onClick={() => set({ activityType: null })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← {t('common.back')}
          </button>
          <p className="text-sm font-medium text-gray-700">{t('step2.livestockInstructions')}</p>
          <div className="space-y-3">
            {LIVESTOCK_SPECIES.map(({ key, emoji, labelKey }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-2xl w-8 text-center">{emoji}</span>
                <label className="flex-1 text-sm text-gray-700">{t(`step2.${labelKey}`)}</label>
                <input
                  type="number" min={0}
                  value={data.livestockHeads[key] || ''}
                  onChange={e => set({ livestockHeads: { ...data.livestockHeads, [key]: parseInt(e.target.value) || 0 } })}
                  placeholder="0"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-xs text-gray-400 w-12">{t('step2.heads')}</span>
              </div>
            ))}
          </div>

          <LivestockBreakdown heads={data.livestockHeads} />
        </div>
      )}

      {data.activityType !== null && (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            ← {t('common.back')}
          </button>
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors
              bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {t('common.next')} →
          </button>
        </div>
      )}
    </div>
  )
}
