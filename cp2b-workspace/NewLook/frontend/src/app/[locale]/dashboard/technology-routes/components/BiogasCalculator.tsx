'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import StepIdentificacao, { type IdentificacaoData } from './StepIdentificacao'
import StepAtividade, { type AtividadeData } from './StepAtividade'
import StepSazonalidade, { DEFAULT_CANE_MONTHS, ALL_MONTHS } from './StepSazonalidade'
import StepOutputs from './StepOutputs'
import ResultsDashboard from './ResultsDashboard'
import {
  runCalculation,
  calcBiogasFromSugarcane,
  calcBiogasFromLivestock,
  calcBiogasFromCrop,
  calcOutputs,
  hectaresToCane,
  type OutputType,
  type CalculationResult,
  type CropType,
  type OutputResult,
  CROP_DEFAULT_MONTHS,
  LIVESTOCK_CATEGORY_SPECIES,
} from '../calculatorEngine'
import { submitLead } from '../calculatorApi'

type Step = 0 | 1 | 2 | 3 | 'results'

const STEP_TITLES = [
  'step1.title',
  'step2.title',
  'step3.title',
  'step4.title',
] as const

const CROP_TYPES: CropType[] = ['corn', 'soy', 'coffee', 'citrus']
const LIVESTOCK_TYPES = new Set(['livestock', 'swine', 'cattle', 'poultry'])

export default function BiogasCalculator() {
  const t = useTranslations('calculator')

  const [step, setStep] = useState<Step>(0)

  const [identificacao, setIdentificacao] = useState<IdentificacaoData>({
    nome: '', email: '', cpf_cnpj: '',
    municipality_id: null, municipality_name: '', consent_lgpd: false,
  })

  const [atividade, setAtividade] = useState<AtividadeData>({
    activityType: null,
    sugarcaneType: 'tons',
    sugarcaneValue: 0,
    livestockHeads: {},
    cropTonnes: 0,
  })

  const [activeMonths, setActiveMonths] = useState<number[]>(DEFAULT_CANE_MONTHS)
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>([])
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null)

  // Compute preview outputs (avg scenario) for StepOutputs
  const previewOutputs = useMemo((): OutputResult | null => {
    const { activityType, sugarcaneType, sugarcaneValue, livestockHeads, cropTonnes } = atividade
    if (!activityType) return null

    let biogasM3 = 0, ch4 = 0.60, biomass = 0, dryLigno = 0

    if (activityType === 'sugarcane' && sugarcaneValue > 0) {
      const tonsRaw = sugarcaneType === 'hectares' ? hectaresToCane(sugarcaneValue) : sugarcaneValue
      const r = calcBiogasFromSugarcane(tonsRaw)
      biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal; dryLigno = r.strawTons
    } else if (LIVESTOCK_TYPES.has(activityType)) {
      const catKey = activityType as 'livestock' | 'swine' | 'cattle' | 'poultry'
      const speciesFilter = catKey === 'livestock' ? null : LIVESTOCK_CATEGORY_SPECIES[catKey as 'swine' | 'cattle' | 'poultry']
      const heads = speciesFilter
        ? Object.fromEntries(
            speciesFilter.filter(s => (livestockHeads[s] ?? 0) > 0).map(s => [s, livestockHeads[s]])
          )
        : livestockHeads
      const r = calcBiogasFromLivestock(heads)
      biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    } else if (CROP_TYPES.includes(activityType as CropType) && cropTonnes > 0) {
      const r = calcBiogasFromCrop(activityType as CropType, cropTonnes)
      biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal; dryLigno = biomass * 0.87
    }

    if (biogasM3 <= 0) return null
    return calcOutputs(biogasM3, ch4, biomass, dryLigno, activeMonths)
  }, [atividade, activeMonths])

  function handleAtividadeChange(d: AtividadeData) {
    const prevType = atividade.activityType
    setAtividade(d)
    if (d.activityType === null) return

    // Update active months per activity type
    if (d.activityType === 'sugarcane') {
      if (activeMonths.length === 12) setActiveMonths(DEFAULT_CANE_MONTHS)
    } else if (CROP_TYPES.includes(d.activityType as CropType)) {
      setActiveMonths(CROP_DEFAULT_MONTHS[d.activityType as CropType])
    } else {
      setActiveMonths(ALL_MONTHS)
    }

  }

  async function handleCalculate() {
    if (!atividade.activityType) return

    const isSugarcane = atividade.activityType === 'sugarcane'
    const isLivestock = atividade.activityType !== null &&
      LIVESTOCK_TYPES.has(atividade.activityType)
    const isCrop = CROP_TYPES.includes(atividade.activityType as CropType)

    const result = runCalculation(
      atividade.activityType,
      isSugarcane ? { type: atividade.sugarcaneType, value: atividade.sugarcaneValue } : null,
      isLivestock  ? { heads: atividade.livestockHeads } : null,
      activeMonths,
      selectedOutputs,
      isCrop ? { tonnes: atividade.cropTonnes } : undefined,
    )

    setCalcResult(result)
    setStep('results')

    if (!identificacao.nome.trim() && !identificacao.email.trim()) return

    const totalHeads = Object.values(atividade.livestockHeads).reduce((s, v) => s + (v ?? 0), 0)
    submitLead({
      lead: {
        nome: identificacao.nome,
        email: identificacao.email,
        cpf_cnpj: identificacao.cpf_cnpj || undefined,
        municipality_id: identificacao.municipality_id ?? undefined,
        municipality_name: identificacao.municipality_name || undefined,
        consent_lgpd: identificacao.consent_lgpd,
      },
      activity_type: atividade.activityType,
      quantity_input: isSugarcane
        ? { type: atividade.sugarcaneType, value: atividade.sugarcaneValue }
        : isCrop
        ? { type: 'tons', value: atividade.cropTonnes }
        : { type: 'heads', value: totalHeads, species_breakdown: atividade.livestockHeads },
      active_months: activeMonths,
      outputs_selected: selectedOutputs,
      calc_results: result,
    })
  }

  function reset() {
    setStep(0)
    setIdentificacao({ nome:'', email:'', cpf_cnpj:'', municipality_id:null, municipality_name:'', consent_lgpd:false })
    setAtividade({ activityType:null, sugarcaneType:'tons', sugarcaneValue:0, livestockHeads:{}, cropTonnes:0 })
    setActiveMonths(DEFAULT_CANE_MONTHS)
    setSelectedOutputs([])
    setCalcResult(null)
  }

  const numericStep = step === 'results' ? 4 : (step as number)

  return (
    <div className="max-w-lg mx-auto">
      {step !== 'results' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className={`flex items-center ${i < 3 ? 'flex-1' : ''}`}>
                <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold
                  ${i < numericStep ? 'bg-green-600 text-white'
                  : i === numericStep ? 'bg-green-600 text-white ring-4 ring-green-100 dark:ring-emerald-900/40'
                  : 'bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                  {i < numericStep ? '✓' : i + 1}
                </div>
                {i < 3 && (
                  <div className={`flex-1 min-w-0 h-1 mx-1 sm:mx-2 rounded
                    ${i < numericStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t(STEP_TITLES[numericStep])}
          </p>
        </div>
      )}

      {step === 0 && (
        <StepIdentificacao
          data={identificacao}
          onChange={setIdentificacao}
          onNext={() => setStep(1)}
          onSkip={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepAtividade
          data={atividade}
          onChange={handleAtividadeChange}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepSazonalidade
          activeMonths={activeMonths}
          activityType={atividade.activityType}
          onChange={setActiveMonths}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepOutputs
          selected={selectedOutputs}
          onChange={setSelectedOutputs}
          onNext={handleCalculate}
          onBack={() => setStep(2)}
          previewOutputs={previewOutputs}
        />
      )}
      {step === 'results' && calcResult && (
        <ResultsDashboard
          result={calcResult}
          municipalityName={identificacao.municipality_name || 'SP'}
          onReset={reset}
        />
      )}
    </div>
  )
}
