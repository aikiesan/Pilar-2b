'use client'

import { useTranslations } from 'next-intl'
import type { Messages } from '@/types/i18n'
import type { Formatters } from '@/lib/format'
import { useFormat } from '@/hooks/useFormat'
import type { ActivityType, LivestockSpecies, CropType } from '../calculatorEngine'
import {
  hectaresToCane,
  isLivestockActivity,
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

/** A message (not a group) under calculator.step2 — checked against the catalog. */
type Step2 = Messages['calculator']['step2']
type Step2Key = { [K in keyof Step2]: Step2[K] extends string ? K : never }[keyof Step2]

/** Livestock species in form order; their names are calculator.step2.<labelKey>. */
export const LIVESTOCK_SPECIES: { key: LivestockSpecies; emoji: string; labelKey: Step2Key }[] = [
  { key: 'swine',        emoji: '🐖', labelKey: 'suinos' },
  { key: 'cattle_beef',  emoji: '🐄', labelKey: 'bovinosCorte' },
  { key: 'cattle_dairy', emoji: '🥛', labelKey: 'bovinosLeite' },
  { key: 'poultry_eggs', emoji: '🥚', labelKey: 'galPostura' },
  { key: 'poultry_meat', emoji: '🍗', labelKey: 'galCorte' },
]

const ACTIVITY_OPTIONS: { key: ActivityType; emoji: string; labelKey: Step2Key; descKey: Step2Key }[] = [
  { key: 'sugarcane', emoji: '🌾', labelKey: 'sugarcane',  descKey: 'sugarcaneDesc'  },
  { key: 'corn',      emoji: '🌽', labelKey: 'corn',       descKey: 'cornDesc'       },
  { key: 'soy',       emoji: '🌿', labelKey: 'soy',        descKey: 'soyDesc'        },
  { key: 'coffee',    emoji: '☕', labelKey: 'coffee',     descKey: 'coffeeDesc'     },
  { key: 'citrus',    emoji: '🍊', labelKey: 'citrus',     descKey: 'citrusDesc'     },
  { key: 'swine',     emoji: '🐖', labelKey: 'swine',      descKey: 'swineDesc'      },
  { key: 'cattle',    emoji: '🐄', labelKey: 'cattle',     descKey: 'cattleDesc'     },
  { key: 'poultry',   emoji: '🐔', labelKey: 'poultry',    descKey: 'poultryDesc'    },
]

const CROP_TYPES: CropType[] = ['corn', 'soy', 'coffee', 'citrus']

type CalculatorT = ReturnType<typeof useTranslations<'calculator'>>

/** A 0–1 fraction as a percentage. */
const pct = (format: Formatters, fraction: number) => format.percent(fraction * 100, { decimals: 0 })

// ── Logarithmic scale helpers ────────────────────────────────────────────────
// Converts a linear slider position (0–1000) ↔ an exponential value (0–max).
// This gives equal thumb travel to each order of magnitude, so small-producer
// quantities (100–500 t) sit comfortably in the middle of the slider.
function posToValue(pos: number, max: number): number {
  if (pos <= 0) return 0
  return Math.round(Math.pow(10, (pos / 1000) * Math.log10(max + 1)) - 1)
}
function valueToPos(val: number, max: number): number {
  if (val <= 0) return 0
  return Math.round((Math.log10(val + 1) / Math.log10(max + 1)) * 1000)
}

// ── Slider with fill + min/max labels ────────────────────────────────────────
interface SliderProps {
  value: number
  max: number
  step?: number
  log?: boolean
  /** Accessible name — the label of the number field it mirrors. */
  label: string
  onChange: (v: number) => void
}
function Slider({ value, max, step = 1, log = false, label, onChange }: SliderProps) {
  const format = useFormat()
  const pos = log ? valueToPos(value, max) : value
  const sliderMax = log ? 1000 : max
  const pct = ((pos / sliderMax) * 100).toFixed(1)

  return (
    <div className="mt-3">
      <input
        type="range"
        min={0}
        max={sliderMax}
        step={log ? 1 : step}
        value={pos}
        aria-label={label}
        aria-valuetext={format.number(value)}
        style={{ '--range-pct': `${pct}%` } as React.CSSProperties}
        onChange={e => {
          const rawPos = parseFloat(e.target.value) || 0
          const v = log ? posToValue(rawPos, max) : rawPos
          onChange(v)
          const newPct = ((rawPos / sliderMax) * 100).toFixed(1)
          e.target.style.setProperty('--range-pct', `${newPct}%`)
        }}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mt-0.5">
        <span>0</span>
        <span>{format.number(max)}</span>
      </div>
    </div>
  )
}

// ── Residue Breakdown Panels ─────────────────────────────────────────────────

type StreamKey = keyof typeof SUGARCANE_STREAMS & keyof Messages['calculator']['streams']
const STREAM_EMOJI: Record<StreamKey, string> = { bagaco: '🟫', palha: '🟡', vinhaca: '🟤', torta: '⚫' }

function SugarcaneBreakdown({ tonsRaw, t, format }: { tonsRaw: number; t: CalculatorT; format: Formatters }) {
  if (tonsRaw <= 0) return null
  const streams = Object.entries(SUGARCANE_STREAMS) as [StreamKey, (typeof SUGARCANE_STREAMS)[StreamKey]][]
  return (
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-1">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">{t('breakdown.caneTitle')}</p>
      {streams.map(([key, s]) => {
        const total = tonsRaw * s.rpr
        const available = total * s.fde
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5" aria-hidden="true">{STREAM_EMOJI[key]}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-slate-300">{t(`streams.${key}.name`)}</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {t('breakdown.generated', { value: format.number(total) })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span className="italic">{t(`streams.${key}.note`, { percent: pct(format, s.fde) })}</span>
                <span className="text-green-700 dark:text-emerald-400 font-medium">
                  {t('breakdown.toBiogas', { value: format.number(available) })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 dark:text-slate-500 pt-1 border-t border-amber-100 dark:border-amber-800/50 mt-2">
        {t.rich('breakdown.caneTotals', {
          total: format.number(streams.reduce((sum, [, r]) => sum + tonsRaw * r.rpr, 0)),
          biogas: format.number(streams.reduce((sum, [, r]) => sum + tonsRaw * r.rpr * r.fde, 0)),
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </div>
  )
}

// Manure volume per head and year, for this preview only (the engine's digestate
// estimate uses its own tonnage table, MANURE_TONS_PER_HEAD_YEAR).
const MANURE_M3_PER_HEAD_YEAR: Record<LivestockSpecies, number> = {
  swine: 3.5, cattle_beef: 10.0, cattle_dairy: 14.0, poultry_eggs: 0.04, poultry_meat: 0.02,
}

function LivestockBreakdown({ heads, t, format }: {
  heads: Partial<Record<LivestockSpecies, number>>; t: CalculatorT; format: Formatters
}) {
  const entries = LIVESTOCK_SPECIES.filter(({ key }) => (heads[key] ?? 0) > 0)
  if (entries.length === 0) return null
  return (
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-2">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">{t('breakdown.herdTitle')}</p>
      {entries.map(({ key, emoji, labelKey }) => {
        const count = heads[key] ?? 0
        const manureTotal = count * MANURE_M3_PER_HEAD_YEAR[key]
        const biogasYear = count * LIVESTOCK_PPB[key].ppb
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5" aria-hidden="true">{emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  {t('breakdown.speciesHeads', { species: t(`step2.${labelKey}`), count })}
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {t('breakdown.manure', { value: format.number(manureTotal) })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span className="italic">{t('breakdown.potential')}</span>
                <span className="text-green-700 dark:text-emerald-400 font-medium">
                  {t('breakdown.biogasYear', { value: format.number(biogasYear) })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CropBreakdown({ cropType, tonnes, t, format, perYear }: {
  cropType: CropType; tonnes: number; t: CalculatorT; format: Formatters; perYear: (tons: number) => string
}) {
  if (tonnes <= 0) return null
  const p = CROP_PARAMS[cropType]
  const available = tonnes * p.avail
  const notUsed = tonnes - available
  return (
    <div className="mt-4 p-3 panel-amber rounded-xl space-y-1 text-xs">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">{t('breakdown.cropTitle')}</p>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-slate-400">{t('breakdown.cropTotal')}</span>
        <span className="font-semibold text-gray-800 dark:text-slate-200">{perYear(tonnes)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-slate-400">
          {t('breakdown.cropAvailable', { percent: pct(format, p.avail) })}
        </span>
        <span className="font-semibold text-green-700 dark:text-emerald-400">{perYear(available)}</span>
      </div>
      <div className="flex justify-between text-gray-400 dark:text-slate-500">
        <span>{t('breakdown.cropOther', { percent: pct(format, 1 - p.avail) })}</span>
        <span>{perYear(notUsed)}</span>
      </div>
      <div className="flex justify-between border-t border-amber-100 dark:border-amber-800/50 pt-1 mt-1">
        <span className="text-gray-500 dark:text-slate-400">{t('breakdown.cropVs')}</span>
        <span className="font-medium text-gray-700 dark:text-slate-300">
          {t('breakdown.cropVsValue', { value: format.number(available * p.vs) })}
        </span>
      </div>
      <p className="text-gray-400 dark:text-slate-500 pt-1">{t('breakdown.source', { source: p.source })}</p>
    </div>
  )
}

type ActivityOption = (typeof ACTIVITY_OPTIONS)[number]

/** The chosen activity, with a button to pick another. */
function ActivityBanner({ option, onChange, t }: { option: ActivityOption | undefined; onChange: () => void; t: CalculatorT }) {
  if (!option) return null
  return (
    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{t(`step2.${option.labelKey}`)}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t(`step2.${option.descKey}`)}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <span aria-hidden="true">× </span>{t('step2.change')}
      </button>
    </div>
  )
}

export default function StepAtividade({ data, onChange, onNext, onBack }: Props) {
  const t = useTranslations('calculator')
  const tUnits = useTranslations('common.units')
  const format = useFormat()
  const perYear = (tons: number) => `${format.number(tons)} ${tUnits('t_year')}`
  const set = (patch: Partial<AtividadeData>) => onChange({ ...data, ...patch })

  const isSugarcane = data.activityType === 'sugarcane'
  const isLivestock = isLivestockActivity(data.activityType)
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
    ? t('step2.caneEquivalent', { value: format.number(hectaresToCane(data.sugarcaneValue)) })
    : null

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

  return (
    <div className="space-y-5">
      {/* Activity type selector grid */}
      {data.activityType === null && (
        <>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_OPTIONS.map(({ key, emoji, labelKey, descKey }) => (
            <button
              key={key}
              onClick={() => set({ activityType: key })}
              className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl
                border-2 border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                hover:border-green-400 dark:hover:border-emerald-500
                hover:bg-green-50 dark:hover:bg-emerald-900/20
                transition-all text-center"
            >
              <span className="text-2xl sm:text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{t(`step2.${labelKey}`)}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{t(`step2.${descKey}`)}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl font-medium text-sm text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          ← {t('common.back')}
        </button>
        </>
      )}

      {/* Sugarcane input */}
      {isSugarcane && (
        <div className="space-y-4">
          <ActivityBanner option={selectedOption} onChange={() => set({ activityType: null })} t={t} />

          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600">
            {(['tons', 'hectares'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => set({ sugarcaneType: opt, sugarcaneValue: 0 })}
                aria-pressed={data.sugarcaneType === opt}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${data.sugarcaneType === opt
                    ? 'bg-green-700 dark:bg-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                {opt === 'tons' ? t('step2.tons') : t('step2.hectares')}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="calc-sugarcane" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {data.sugarcaneType === 'tons' ? t('step2.tonsLabel') : t('step2.hectaresLabel')}
            </label>
            <input
              id="calc-sugarcane"
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
              log
              label={data.sugarcaneType === 'tons' ? t('step2.tonsLabel') : t('step2.hectaresLabel')}
              onChange={v => set({ sugarcaneValue: v })}
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">
              {data.sugarcaneType === 'tons' ? t('step2.reference.caneTons') : t('step2.reference.caneHectares')}
            </p>
            {caneHint && <p className="text-xs text-green-600 dark:text-emerald-400 mt-1">📊 {caneHint}</p>}
            {biogasPreview !== null && biogasPreview > 0 && (
              <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-1">
                🔬 {t('step2.preview', { value: format.number(biogasPreview) })}
              </p>
            )}
          </div>

          <SugarcaneBreakdown
            tonsRaw={data.sugarcaneType === 'hectares' ? hectaresToCane(data.sugarcaneValue) : data.sugarcaneValue}
            t={t}
            format={format}
          />
        </div>
      )}

      {/* Generic crop input */}
      {isCrop && (
        <div className="space-y-4">
          <ActivityBanner option={selectedOption} onChange={() => set({ activityType: null })} t={t} />

          {/* Seasonal warning banner */}
          <div className="flex items-start gap-2 p-3 panel-yellow rounded-xl text-xs text-yellow-800 dark:text-yellow-300">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <p>{t('step2.seasonalWarning')}</p>
          </div>

          <div>
            <label htmlFor="calc-crop-tonnes" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {t('step2.cropTonnesLabel')}
            </label>
            <input
              id="calc-crop-tonnes"
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
              log
              label={t('step2.cropTonnesLabel')}
              onChange={v => set({ cropTonnes: v })}
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{t('step2.reference.crop')}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t('step2.cropTonnesHint')}</p>
            {biogasPreview !== null && biogasPreview > 0 && (
              <p className="text-xs text-green-700 dark:text-emerald-400 font-medium mt-1">
                🔬 {t('step2.preview', { value: format.number(biogasPreview) })}
              </p>
            )}
          </div>

          {isCrop && data.activityType && (
            <CropBreakdown
              cropType={data.activityType as CropType}
              tonnes={data.cropTonnes}
              t={t}
              format={format}
              perYear={perYear}
            />
          )}
        </div>
      )}

      {/* Livestock input */}
      {isLivestock && (
        <div className="space-y-4">
          <ActivityBanner option={selectedOption} onChange={() => set({ activityType: null })} t={t} />

          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('step2.livestockInstructions')}</p>
          <div className="space-y-5">
            {visibleSpecies.map(({ key, emoji, labelKey }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center shrink-0" aria-hidden="true">{emoji}</span>
                  <label htmlFor={`calc-heads-${key}`} className="flex-1 text-sm text-gray-700 dark:text-slate-300">
                    {t(`step2.${labelKey}`)}
                  </label>
                  <input
                    id={`calc-heads-${key}`}
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
                  log
                  label={t(`step2.${labelKey}`)}
                  onChange={v => set({ livestockHeads: { ...data.livestockHeads, [key]: v } })}
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 italic">{t(`step2.reference.${key}`)}</p>
              </div>
            ))}
          </div>

          {biogasPreview !== null && biogasPreview > 0 && (
            <p className="text-xs text-green-700 dark:text-emerald-400 font-medium">
              🔬 {t('step2.preview', { value: format.number(biogasPreview) })}
            </p>
          )}

          <LivestockBreakdown
            heads={
              Object.fromEntries(
                visibleSpecies
                  .filter(sp => (data.livestockHeads[sp.key] ?? 0) > 0)
                  .map(sp => [sp.key, data.livestockHeads[sp.key]])
              ) as Partial<Record<LivestockSpecies, number>>
            }
            t={t}
            format={format}
          />
        </div>
      )}

      {data.activityType !== null && (
        <div className="flex gap-3">
          <button
            onClick={() => set({ activityType: null })}
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
