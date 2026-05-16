'use client'

import { useTranslations } from 'next-intl'
import type { ActivityType, LivestockSpecies, CropType } from '../calculatorEngine'
import {
  hectaresToCane,
  CROP_PARAMS,
  SUGARCANE_STREAMS,
  LIVESTOCK_PPB,
  LIVESTOCK_CATEGORY_SPECIES,
  calcBiogasFromSugarcane,
  calcBiogasFromLivestock,
  calcBiogasFromCrop,
} from '../calculatorEngine'

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
  { key: 'swine',     emoji: '🐖', labelKey: 'swine',      descKey: 'swineDesc'      },
  { key: 'cattle',    emoji: '🐄', labelKey: 'cattle',     descKey: 'cattleDesc'     },
  { key: 'poultry',   emoji: '🐔', labelKey: 'poultry',    descKey: 'poultryDesc'    },
]

const LIVESTOCK_CATEGORY_TYPES = new Set<ActivityType>(['livestock', 'swine', 'cattle', 'poultry'])
const CROP_TYPES: CropType[] = ['corn', 'soy', 'coffee', 'citrus']

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function fmtBiogas(m3: number): string {
  return m3.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Update the CSS gradient fill on a range input to reflect its current value */
function updateRangeFill(el: HTMLInputElement, max: number) {
  const pct = max > 0 ? ((parseFloat(el.value) / max) * 100).toFixed(1) : '0'
  el.style.setProperty('--range-pct', `${pct}%`)
}

// ── Slider with fill + min/max labels ────────────────────────────────────────
interface SliderProps {
  value: number
  max: number
  step?: number
  onChange: (v: number) => void
}
function Slider({ value, max, step = 1, onChange }: SliderProps) {
  return (
    <div className="mt-3">
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        style={{ '--range-pct': `${max > 0 ? ((value / max) * 100).toFixed(1) : 0}%` } as React.CSSProperties}
        onChange={e => {
          const v = parseFloat(e.target.value) || 0
          onChange(v)
          updateRangeFill(e.target, max)
        }}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mt-0.5">
        <span>0</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

// ── Residue Breakdown Panels ─────────────────────────────────────────────────

const STREAM_LABELS: Record<keyof typeof SUGARCANE_STREAMS, { label: string; emoji: string; note: string }> = {
  bagaco:  { label: 'Bagaço',          emoji: '🟫', note: `${(SUGARCANE_STREAMS.bagaco.fde  * 100).toFixed(0)}% disponível p/ biogás (resto: cogeração)` },
  palha:   { label: 'Palha / Palhiço', emoji: '🟡', note: `${(SUGARCANE_STREAMS.palha.fde   * 100).toFixed(0)}% disponível p/ biogás (resto: cobertura do solo)` },
  vinhaca: { label: 'Vinhaça',         emoji: '🟤', note: `${(SUGARCANE_STREAMS.vinhaca.fde * 100).toFixed(0)}% disponível p/ biogás (10% fertirrigação obrigatória)` },
  torta:   { label: 'Torta de filtro', emoji: '⚫', note: `${(SUGARCANE_STREAMS.torta.fde   * 100).toFixed(0)}% disponível p/ biogás (resto: adubo)` },
}

function SugarcaneBreakdown({ tonsRaw }: { tonsRaw: number }) {
  if (tonsRaw <= 0) return null
  return (
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-1">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">📦 Resíduos gerados pelo seu processo:</p>
      {(Object.entries(SUGARCANE_STREAMS) as [keyof typeof SUGARCANE_STREAMS, typeof SUGARCANE_STREAMS[keyof typeof SUGARCANE_STREAMS]][]).map(([key, s]) => {
        const total = tonsRaw * s.rpr
        const available = total * s.fde
        const meta = STREAM_LABELS[key]
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-slate-300">{meta.label}</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">{fmt(total)} t geradas</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span className="italic">{meta.note}</span>
                <span className="text-green-700 dark:text-emerald-400 font-medium">→ {fmt(available)} t p/ biogás</span>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 dark:text-slate-500 pt-1 border-t border-amber-100 dark:border-amber-800/50 mt-2">
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
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-2">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">📦 Estimativa de resíduos do seu rebanho:</p>
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
                <span className="font-medium text-gray-700 dark:text-slate-300">{meta.label} — {fmt(count)} cabeças</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">≈ {fmt(manureTotal)} m³ esterco/ano</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span className="italic">Potencial (PPB)</span>
                <span className="text-green-700 dark:text-emerald-400 font-medium">→ {fmt(biogasYear)} m³ biogás/ano</span>
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
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-1 text-xs">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">📦 Estimativa de resíduo gerado:</p>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-slate-400">Total de resíduo informado</span>
        <span className="font-semibold text-gray-800 dark:text-slate-200">{fmt(tonnes)} t/ano</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-slate-400">Disponível para biodigestor ({(p.avail * 100).toFixed(0)}%)</span>
        <span className="font-semibold text-green-700 dark:text-emerald-400">{fmt(available)} t/ano</span>
      </div>
      <div className="flex justify-between text-gray-400 dark:text-slate-500">
        <span>Outros usos / perdas ({(100 - p.avail * 100).toFixed(0)}%)</span>
        <span>{fmt(notUsed)} t/ano</span>
      </div>
      <div className="flex justify-between border-t border-amber-100 dark:border-amber-800/50 pt-1 mt-1">
        <span className="text-gray-500 dark:text-slate-400">Sólidos Voláteis (SV) disponíveis</span>
        <span className="font-medium text-gray-700 dark:text-slate-300">{fmt(available * p.vs)} t SV/ano</span>
      </div>
      <p className="text-gray-400 dark:text-slate-500 pt-1">Fonte dos parâmetros: {p.source}</p>
    </div>
  )
}

export default function StepAtividade({ data, onChange, onNext, onBack }: Props) {
  const t = useTranslations('calculator')
  const set = (patch: Partial<AtividadeData>) => onChange({ ...data, ...patch })

  const isSugarcane = data.activityType === 'sugarcane'
  const isLivestock = data.activityType !== null && LIVESTOCK_CATEGORY_TYPES.has(data.activityType)
  const isCrop = data.activityType !== null && CROP_TYPES.includes(data.activityType as CropType)

  // Species visible for the selected livestock category
  const livestockCatKey = data.activityType as 'swine' | 'cattle' | 'poultry' | null
  const visibleSpecies = isLivestock && livestockCatKey && livestockCatKey in LIVESTOCK_CATEGORY_SPECIES
    ? LIVESTOCK_SPECIES.filter(s => LIVESTOCK_CATEGORY_SPECIES[livestockCatKey].includes(s.key))
    : LIVESTOCK_SPECIES

  const visibleHeads = visibleSpecies.reduce((s, sp) => s + (data.livestockHeads[sp.key] ?? 0), 0)

  const canAdvance = (() => {
    if (isSugarcane) return data.sugarcaneValue > 0
    if (isLivestock) return visibleHeads > 0
    if (isCrop)      return data.cropTonnes > 0
    return false
  })()

  const caneHint = data.sugarcaneType === 'hectares' && data.sugarcaneValue > 0
    ? `≈ ${Math.round(hectaresToCane(data.sugarcaneValue)).toLocaleString('pt-BR')} t/ano`
    : null

  const cropLabel = isCrop && data.activityType
    ? CROP_PARAMS[data.activityType as CropType].descLabel
    : ''

  const selectedOption = ACTIVITY_OPTIONS.find(o => o.key === data.activityType)

  // Real-time biogas preview
  const biogasPreview = (() => {
    if (isSugarcane && data.sugarcaneValue > 0) {
      const tonsRaw = data.sugarcaneType === 'hectares' ? hectaresToCane(data.sugarcaneValue) : data.sugarcaneValue
      return calcBiogasFromSugarcane(tonsRaw).biogasM3
    }
    if (isCrop && data.activityType && data.cropTonnes > 0) {
      return calcBiogasFromCrop(data.activityType as CropType, data.cropTonnes).biogasM3
    }
    if (isLivestock && visibleHeads > 0) {
      const headsFiltered = Object.fromEntries(
        visibleSpecies
          .filter(sp => (data.livestockHeads[sp.key] ?? 0) > 0)
          .map(sp => [sp.key, data.livestockHeads[sp.key]])
      ) as Partial<Record<LivestockSpecies, number>>
      return calcBiogasFromLivestock(headsFiltered).biogasM3
    }
    return null
  })()

  // Shared activity header banner with "× Trocar" chip
  function ActivityBanner() {
    if (!selectedOption) return null
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedOption.emoji}</span>
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">
              {t(`step2.${selectedOption.labelKey}`)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t(`step2.${selectedOption.descKey}`)}
            </p>
          </div>
        </div>
        <button
          onClick={() => set({ activityType: null })}
          className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          × Trocar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Activity type selector grid */}
      {data.activityType === null && (
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_OPTIONS.map(({ key, emoji, labelKey, descKey }) => (
            <button
              key={key}
              onClick={() => set({ activityType: key })}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                border-2 border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                hover:border-green-400 dark:hover:border-emerald-500
                hover:bg-green-50 dark:hover:bg-emerald-900/20
                transition-all text-center"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{t(`step2.${labelKey}`)}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{t(`step2.${descKey}`)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sugarcane input */}
      {isSugarcane && (
        <div className="space-y-4">
          <ActivityBanner />

          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600">
            {(['tons', 'hectares'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => set({ sugarcaneType: opt, sugarcaneValue: 0 })}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${data.sugarcaneType === opt
                    ? 'bg-green-600 dark:bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                {opt === 'tons' ? t('step2.tons') : t('step2.hectares')}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {data.sugarcaneType === 'tons' ? t('step2.tonsLabel') : t('step2.hectaresLabel')}
            </label>
            <input
              type="number"
              min={0}
              value={data.sugarcaneValue || ''}
              onChange={e => set({ sugarcaneValue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="input-field"
            />
            <Slider
              value={data.sugarcaneValue}
              max={data.sugarcaneType === 'hectares' ? 1000 : 10000}
              step={data.sugarcaneType === 'hectares' ? 10 : 100}
              onChange={v => set({ sugarcaneValue: v })}
            />
            {caneHint && <p className="text-xs text-green-600 dark:text-emerald-400 mt-2">📊 {caneHint}</p>}
            {biogasPreview !== null && biogasPreview > 0 && (
              <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-1">
                🔬 ~ {fmtBiogas(biogasPreview)} m³ biogás/ano estimado (cenário ideal)
              </p>
            )}
          </div>

          <SugarcaneBreakdown
            tonsRaw={data.sugarcaneType === 'hectares' ? hectaresToCane(data.sugarcaneValue) : data.sugarcaneValue}
          />
        </div>
      )}

      {/* Generic crop input */}
      {isCrop && (
        <div className="space-y-4">
          <ActivityBanner />

          {/* Seasonal warning banner */}
          <div className="flex items-start gap-2 p-3 panel-yellow rounded-xl text-xs text-yellow-800 dark:text-yellow-300">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <p>{t('step2.seasonalWarning')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t('step2.cropTonnesLabel')}
            </label>
            <input
              type="number"
              min={0}
              value={data.cropTonnes || ''}
              onChange={e => set({ cropTonnes: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="input-field"
            />
            <Slider
              value={data.cropTonnes}
              max={10000}
              step={50}
              onChange={v => set({ cropTonnes: v })}
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('step2.cropTonnesHint')}</p>
            {biogasPreview !== null && biogasPreview > 0 && (
              <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-1">
                🔬 ~ {fmtBiogas(biogasPreview)} m³ biogás/ano estimado (cenário ideal)
              </p>
            )}
          </div>

          {isCrop && data.activityType && (
            <CropBreakdown cropType={data.activityType as CropType} tonnes={data.cropTonnes} />
          )}
        </div>
      )}

      {/* Livestock input */}
      {isLivestock && (
        <div className="space-y-4">
          <ActivityBanner />

          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('step2.livestockInstructions')}</p>
          <div className="space-y-5">
            {visibleSpecies.map(({ key, emoji, labelKey }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center shrink-0">{emoji}</span>
                  <label className="flex-1 text-sm text-gray-700 dark:text-slate-300">{t(`step2.${labelKey}`)}</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={data.livestockHeads[key] || ''}
                    onChange={e => set({ livestockHeads: { ...data.livestockHeads, [key]: parseInt(e.target.value) || 0 } })}
                    placeholder="0"
                    className="w-24 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-400 dark:text-slate-500 w-10">{t('step2.heads')}</span>
                </div>
                <Slider
                  value={data.livestockHeads[key] ?? 0}
                  max={5000}
                  step={10}
                  onChange={v => set({ livestockHeads: { ...data.livestockHeads, [key]: v } })}
                />
              </div>
            ))}
          </div>

          {biogasPreview !== null && biogasPreview > 0 && (
            <p className="text-xs text-green-700 dark:text-emerald-400 font-medium">
              🔬 ~ {fmtBiogas(biogasPreview)} m³ biogás/ano estimado (cenário ideal)
            </p>
          )}

          <LivestockBreakdown heads={
            Object.fromEntries(
              visibleSpecies
                .filter(sp => (data.livestockHeads[sp.key] ?? 0) > 0)
                .map(sp => [sp.key, data.livestockHeads[sp.key]])
            ) as Partial<Record<LivestockSpecies, number>>
          } />
        </div>
      )}

      {data.activityType !== null && (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            ← {t('common.back')}
          </button>
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors
              bg-green-600 dark:bg-emerald-600 hover:bg-green-700 dark:hover:bg-emerald-700
              disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {t('common.next')} →
          </button>
        </div>
      )}
    </div>
  )
}
