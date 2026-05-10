'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { technologyRoutesApi } from '@/services/technologyRoutesApi';
import { DETAILED_RESIDUES } from '@/data/residueFactors';
import type { TechnologyCardWithReferences, WizardConfig } from '@/types/technology-routes';

interface WelcomeWizardProps {
  onComplete: (config: WizardConfig) => void;
  onClose: () => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const TOTAL_STEPS = 3;

export default function WelcomeWizard({ onComplete, onClose }: WelcomeWizardProps) {
  const t = useTranslations('technology_routes.wizard');
  const [step, setStep] = useState(0);
  const [technologies, setTechnologies] = useState<TechnologyCardWithReferences[]>([]);
  const [loadingTech, setLoadingTech] = useState(true);

  // Form state
  const [activeCategory, setActiveCategory] = useState<'urban' | 'livestock' | 'agricultural' | 'industrial'>('agricultural');
  const [residueCode, setResidueCode] = useState('');
  const [amountTons, setAmountTons] = useState<number | ''>('');
  const [availabilityMonths, setAvailabilityMonths] = useState<number[]>([]);
  const [preTreatmentId, setPreTreatmentId] = useState<string | null>(null);
  const [digesterTechnologyId, setDigesterTechnologyId] = useState('');
  const [outputIds, setOutputIds] = useState<string[]>([]);
  
  // Monetary state
  const [electricityTariff, setElectricityTariff] = useState<number | ''>('');
  const [biomethanePrice, setBiomethanePrice] = useState<number | ''>('');
  const [fertilizerPrice, setFertilizerPrice] = useState<number | ''>('');

  useEffect(() => {
    technologyRoutesApi.getTechnologies()
      .then(data => setTechnologies(data))
      .catch(() => { /* loadingTech stays true but we render a message */ })
      .finally(() => setLoadingTech(false));
  }, []);

  const pretreatments = technologies.filter(tech => tech.category === 'pretreatment');
  const digesters    = technologies.filter(tech => tech.category === 'digestion');
  const outputs      = technologies.filter(
    tech => tech.category === 'upgrading' || tech.category === 'enduse' || tech.category === 'byproduct'
  );

  const canAdvance = () => {
    if (step === 0) return residueCode !== '' && (amountTons !== '' && amountTons > 0);
    if (step === 1) return availabilityMonths.length > 0;
    if (step === 2) return digesterTechnologyId !== '' && outputIds.length > 0;
    return false;
  };

  const handleToggleMonth = (m: number) =>
    setAvailabilityMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
    );

  const handleToggleOutput = (id: string) =>
    setOutputIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = () =>
    onComplete({ 
      residueCode, 
      amountTons: amountTons || 0, 
      availabilityMonths, 
      preTreatmentId, 
      digesterTechnologyId, 
      outputIds,
      tariffs: {
        electricity: electricityTariff || undefined,
        biomethane: biomethanePrice || undefined,
        fertilizer: fertilizerPrice || undefined
      }
    });

  const stepTitles = [t('step1_title'), t('step2_title'), t('step3_title')];
  const selectedResidue = DETAILED_RESIDUES.find(r => r.code === residueCode);

  // Helper to get emoji for residue category
  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'urban': return '🏙️';
      case 'livestock': return '🐄';
      case 'agricultural': return '🌾';
      case 'industrial': return '🏭';
      default: return '♻️';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-cp2b-green to-cp2b-lime px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">{t('title')}</h2>
              <p className="text-sm text-white/80">{stepTitles[step]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-cp2b-green' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {t('step_indicator', { current: step + 1, total: TOTAL_STEPS })}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">

          {/* ── Step 0: Residue & Amount ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('residue_label')} <span className="text-red-500">*</span>
                </label>
                
                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                  {(['agricultural', 'livestock', 'urban', 'industrial'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                        activeCategory === cat 
                          ? 'bg-white text-cp2b-dark-green shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span className="mr-1">{getCategoryEmoji(cat)}</span>
                      {t(`category_${cat}`)}
                    </button>
                  ))}
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {DETAILED_RESIDUES.filter(r => r.category === activeCategory).map(r => (
                    <button
                      key={r.code}
                      onClick={() => setResidueCode(r.code)}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        residueCode === r.code
                          ? 'bg-cp2b-green/10 border-cp2b-green shadow-sm ring-1 ring-cp2b-green'
                          : 'bg-white border-gray-200 hover:border-cp2b-green'
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-900 mb-1 line-clamp-2">{r.name}</span>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-cp2b-green font-semibold">FDE {r.fde.toFixed(1)}%</span>
                        {residueCode === r.code && <CheckCircle2 className="h-3.5 w-3.5 text-cp2b-green" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('amount_label')} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={amountTons}
                    min={1}
                    step={100}
                    placeholder="0"
                    onChange={e => setAmountTons(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent shadow-sm"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap font-medium">t/ano</span>
                </div>
                {selectedResidue?.potentialSP && (
                  <p className="text-xs text-gray-400 mt-1.5 italic">
                    {t('sp_reference')}: {selectedResidue.potentialSP}
                  </p>
                )}
              </div>

              {selectedResidue && (
                <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl px-4 py-3 border border-green-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-cp2b-dark-green uppercase tracking-wider">{selectedResidue.name}</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-cp2b-green border border-green-100">BMP: {selectedResidue.bmp}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{selectedResidue.observation}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Availability ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('availability_hint')}</p>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleToggleMonth(m)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      availabilityMonths.includes(m)
                        ? 'bg-cp2b-green text-white border-cp2b-green shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-cp2b-green'
                    }`}
                  >
                    {MONTH_NAMES_SHORT[i]}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setAvailabilityMonths(MONTHS)} className="text-xs text-cp2b-green hover:underline">
                  {t('select_all_months')}
                </button>
                <button type="button" onClick={() => setAvailabilityMonths([])} className="text-xs text-gray-500 hover:underline">
                  {t('clear_months')}
                </button>
              </div>
              {availabilityMonths.length > 0 && (
                <p className="text-sm bg-green-50 rounded-lg px-3 py-2 text-gray-700 border border-green-100">
                  {t('months_selected', { count: availabilityMonths.length })}
                  {availabilityMonths.length < 12 && (
                    <span className="text-amber-600 ml-1 font-medium">— {t('seasonal_warning')}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Process config ── */}
          {step === 2 && (
            <div className="space-y-6">
              {loadingTech ? (
                <div className="text-center py-8 text-gray-500 text-sm animate-pulse">{t('loading_technologies')}</div>
              ) : technologies.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-medium text-red-600">{t('no_technologies_found')}</p>
                </div>
              ) : (
                <>
                  {/* Pre-treatment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('pretreatment_label')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                    </label>
                    <select
                      value={preTreatmentId ?? ''}
                      onChange={e => setPreTreatmentId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent"
                    >
                      <option value="">{t('none')}</option>
                      {pretreatments.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.emoji} {tech.namePt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Digester */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('digester_label')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={digesterTechnologyId}
                      onChange={e => setDigesterTechnologyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent shadow-sm"
                    >
                      <option value="">{t('digester_placeholder')}</option>
                      {digesters.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.emoji} {tech.namePt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Outputs multi-select */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('outputs_label')} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {outputs.map(tech => (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => handleToggleOutput(tech.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            outputIds.includes(tech.id)
                              ? 'bg-cp2b-green/10 border-cp2b-green text-cp2b-dark-green shadow-sm ring-1 ring-cp2b-green'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-cp2b-green'
                          }`}
                        >
                          <span className="text-xl flex-shrink-0">{tech.emoji}</span>
                          <span className="flex-1 truncate text-xs font-bold uppercase tracking-tight">{tech.namePt}</span>
                          {outputIds.includes(tech.id) && (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cp2b-green" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monetary Inputs (revealed based on selection) */}
                  {outputIds.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <h4 className="text-sm font-bold text-cp2b-dark-green flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Estimativa de Valores de Mercado
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">Insira os valores locais para estimar o retorno financeiro.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Electricity */}
                        {(outputIds.some(id => id.includes('elec')) || outputIds.some(id => id.includes('gen'))) && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Tarifa de Energia</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={electricityTariff}
                                onChange={e => setElectricityTariff(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full pl-9 pr-12 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent outline-none shadow-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">/kWh</span>
                            </div>
                          </div>
                        )}

                        {/* Biomethane */}
                        {outputIds.some(id => id.includes('methane') || id.includes('gnv')) && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Preço do Biometano</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                              <input
                                type="number"
                                step="0.10"
                                placeholder="0,00"
                                value={biomethanePrice}
                                onChange={e => setBiomethanePrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full pl-9 pr-12 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent outline-none shadow-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">/m³</span>
                            </div>
                          </div>
                        )}

                        {/* Fertilizer */}
                        {outputIds.some(id => id.includes('fert') || id.includes('biofert')) && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Preço do Biofertilizante</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                              <input
                                type="number"
                                step="1"
                                placeholder="0,00"
                                value={fertilizerPrice}
                                onChange={e => setFertilizerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full pl-9 pr-12 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent outline-none shadow-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">/ton</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? t('cancel') : t('back')}
          </button>

          <button
            type="button"
            onClick={() => step < TOTAL_STEPS - 1 ? setStep(s => s + 1) : handleSubmit()}
            disabled={!canAdvance()}
            className="flex items-center gap-1.5 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-cp2b-green to-cp2b-lime hover:from-cp2b-dark-green hover:to-cp2b-green rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step < TOTAL_STEPS - 1 ? (
              <>{t('next')}<ArrowRight className="h-4 w-4" /></>
            ) : (
              <>{t('generate')}<Sparkles className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
