'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { technologyRoutesApi } from '@/services/technologyRoutesApi';
import { DETAILED_RESIDUES } from '@/data/residueFactors';
import {
  SP_MARKET_BASELINES,
  CONVERSION,
  OUTCOME_TO_TECH_IDS,
  DEFAULT_UPGRADING_TECH,
  calcOutcome,
} from '@/data/market-prices';
import type { TechnologyCardWithReferences, WizardConfig } from '@/types/technology-routes';

interface WelcomeWizardProps {
  onComplete: (config: WizardConfig) => void;
  onClose: () => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const TOTAL_STEPS = 3;

// Business outcomes — labels in Portuguese (primary app language)
const OUTCOMES = [
  { id: 'elec', icon: '⚡', label: 'Energia Elétrica',    desc: 'Gerar eletricidade via cogeração (CHP)',        unit: 'kWh',  priceKey: 'electricity' as const },
  { id: 'fuel', icon: '🚗', label: 'Biometano Veicular',  desc: 'Combustível para frota — substitui diesel',     unit: 'm³ CH₄', priceKey: 'biomethane' as const },
  { id: 'heat', icon: '♨️', label: 'Calor / Vapor',       desc: 'Energia térmica para processos industriais',   unit: 'GJ',   priceKey: 'heat'        as const },
  { id: 'fert', icon: '🌱', label: 'Fertilizante',        desc: 'Digestato — substitui NPK e ureia química',    unit: 'ton',  priceKey: 'fertilizer'  as const },
  { id: 'co2',  icon: '💨', label: 'Créditos de Carbono', desc: 'CO₂ capturado — mercado voluntário (VCM)',      unit: 'tCO₂', priceKey: 'carbon'      as const },
] as const;

// Upgrading tech options shown when 'fuel' is selected
const PURIFICATION_OPTS = [
  { id: 'upg_membrane',           icon: '🧬', label: 'Membrana' },
  { id: 'upg_psa',                icon: '🔬', label: 'PSA' },
  { id: 'upg_water_scrubbing',    icon: '💦', label: 'Water Scrubbing' },
  { id: 'upg_chemical_scrubbing', icon: '⚗️', label: 'Scrubbing Químico' },
];

// Tariff rows in order
const TARIFF_ROWS = [
  { key: 'electricity' as const, outcomeId: 'elec', icon: '⚡', unit: 'R$/kWh', step: 0.01 },
  { key: 'biomethane'  as const, outcomeId: 'fuel', icon: '🚗', unit: 'R$/m³',  step: 0.01 },
  { key: 'heat'        as const, outcomeId: 'heat', icon: '♨️', unit: 'R$/GJ',  step: 1    },
  { key: 'fertilizer'  as const, outcomeId: 'fert', icon: '🌱', unit: 'R$/ton', step: 1    },
  { key: 'carbon'      as const, outcomeId: 'co2',  icon: '💨', unit: 'R$/tCO₂',step: 1    },
];

function fmtQty(n: number, unit: string): string {
  const s = n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
    : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k`
    : n.toFixed(n < 10 ? 1 : 0);
  return `${s} ${unit}`;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export default function WelcomeWizard({ onComplete, onClose }: WelcomeWizardProps) {
  const t = useTranslations('technology_routes.wizard');
  const [step, setStep] = useState(0);
  const [technologies, setTechnologies] = useState<TechnologyCardWithReferences[]>([]);
  const [loadingTech, setLoadingTech] = useState(true);

  // Step 0
  const [residueCode, setResidueCode] = useState('');
  const [activeCategory, setActiveCategory] = useState<'agricultural' | 'livestock' | 'urban' | 'industrial'>('agricultural');
  const [amountTons, setAmountTons] = useState<number | ''>('');

  // Step 1
  const [availabilityMonths, setAvailabilityMonths] = useState<number[]>([]);

  // Step 2
  const [preTreatmentId, setPreTreatmentId] = useState<string | null>(null);
  const [digesterTechnologyId, setDigesterTechnologyId] = useState('');
  const [businessOutcomes, setBusinessOutcomes] = useState<string[]>([]);
  const [upgradingTechId, setUpgradingTechId] = useState(DEFAULT_UPGRADING_TECH);
  const [tariffValues, setTariffValues] = useState<Record<string, string>>({
    electricity: '', biomethane: '', heat: '', fertilizer: '', carbon: '',
  });

  useEffect(() => {
    technologyRoutesApi.getTechnologies()
      .then(data => setTechnologies(data))
      .catch(() => {})
      .finally(() => setLoadingTech(false));
  }, []);

  const pretreatments = technologies.filter(t => t.category === 'pretreatment');
  const digesters     = technologies.filter(t => t.category === 'digestion');
  const selectedResidue = DETAILED_RESIDUES.find(r => r.code === residueCode);

  // Seasonality-adjusted biogas estimate used for real-time card preview
  const { adjBiogasM3, adjTons } = useMemo(() => {
    if (!selectedResidue || !amountTons) return { adjBiogasM3: 0, adjTons: 0 };
    const availFrac = availabilityMonths.length > 0 ? availabilityMonths.length / 12 : 1;
    const biogas = Number(amountTons) * (selectedResidue.rpr ?? 1.0) * selectedResidue.bmp * 1000 * (selectedResidue.fde / 100) * availFrac;
    return { adjBiogasM3: biogas, adjTons: Number(amountTons) * availFrac };
  }, [selectedResidue, amountTons, availabilityMonths]);

  // Parsed price overrides (undefined → SP baseline used by calcOutcome)
  const parsedPrices = useMemo(() => {
    const out: Partial<Record<string, number>> = {};
    for (const [k, v] of Object.entries(tariffValues)) {
      if (v) out[k] = parseFloat(v);
    }
    return out;
  }, [tariffValues]);

  const canAdvance = () => {
    if (step === 0) return residueCode !== '' && amountTons !== '' && Number(amountTons) > 0;
    if (step === 1) return availabilityMonths.length > 0;
    if (step === 2) return digesterTechnologyId !== '' && businessOutcomes.length > 0;
    return false;
  };

  const handleToggleOutcome = (id: string) =>
    setBusinessOutcomes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleToggleMonth = (m: number) =>
    setAvailabilityMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
    );

  const handleSubmit = () => {
    // Derive tech IDs from business outcome choices
    const outputIds = businessOutcomes.flatMap(id => {
      if (id === 'fuel') return [upgradingTechId || DEFAULT_UPGRADING_TECH, ...(OUTCOME_TO_TECH_IDS['fuel'] ?? [])];
      return OUTCOME_TO_TECH_IDS[id] ?? [];
    });

    const tariffs: WizardConfig['tariffs'] = {};
    for (const row of TARIFF_ROWS) {
      const v = tariffValues[row.key];
      if (v) (tariffs as Record<string, number>)[row.key] = parseFloat(v);
    }

    onComplete({
      residueCode,
      amountTons: Number(amountTons) || 0,
      availabilityMonths,
      preTreatmentId,
      digesterTechnologyId,
      outputIds,
      businessOutcomes,
      upgradingTechId: businessOutcomes.includes('fuel') ? upgradingTechId : undefined,
      tariffs,
    });
  };

  const stepTitles = [t('step1_title'), t('step2_title'), t('step3_title')];

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
          <button onClick={onClose} className="text-white bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors" aria-label={t('close')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-cp2b-green' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">{t('step_indicator', { current: step + 1, total: TOTAL_STEPS })}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">

          {/* ── Step 0: Residue & Amount ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('residue_label')} <span className="text-red-500">*</span>
                </label>

                {/* Category tabs */}
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg">
                  {([
                    { key: 'agricultural', emoji: '🌾' },
                    { key: 'livestock',    emoji: '🐄' },
                    { key: 'urban',        emoji: '🏙️' },
                    { key: 'industrial',   emoji: '🏭' },
                  ] as const).map(({ key, emoji }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveCategory(key)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                        activeCategory === key
                          ? 'bg-white text-cp2b-dark-green shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="hidden sm:inline">{t(`category_${key}`)}</span>
                    </button>
                  ))}
                </div>

                {/* Residue cards — observation hint instead of FDE% */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                  {DETAILED_RESIDUES.filter(r => r.category === activeCategory).map(r => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setResidueCode(r.code)}
                      className={`text-left px-3 py-2 rounded-lg border transition-all ${
                        residueCode === r.code
                          ? 'bg-cp2b-green/10 border-cp2b-green ring-1 ring-cp2b-green text-cp2b-dark-green'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-cp2b-green'
                      }`}
                    >
                      <p className="text-sm font-medium truncate leading-tight">{r.name}</p>
                      {r.observation ? (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 italic leading-tight">{r.observation}</p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5">{r.classification}</p>
                      )}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">t/ano</span>
                </div>
                {selectedResidue?.potentialSP && (
                  <p className="text-xs text-gray-500 mt-1">{t('sp_reference')}: {selectedResidue.potentialSP}</p>
                )}
              </div>

              {selectedResidue && (
                <div className="bg-green-50 rounded-lg px-4 py-3 text-sm text-gray-700 space-y-1">
                  <div className="flex gap-4">
                    <p><span className="font-medium">BMP:</span> {selectedResidue.bmp} m³/kgSV</p>
                  </div>
                  {selectedResidue.observation && (
                    <p className="text-xs text-gray-500 italic">{selectedResidue.observation}</p>
                  )}
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
                <p className="text-sm bg-green-50 rounded-lg px-3 py-2 text-gray-700">
                  {t('months_selected', { count: availabilityMonths.length })}
                  {availabilityMonths.length < 12 && (
                    <span className="text-amber-600 ml-1">— {t('seasonal_warning')}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Outcomes + process config ── */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Section A — Business outcome cards (always rendered) */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('outcomes_label')} <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                  {OUTCOMES.map(outcome => {
                    const selected = businessOutcomes.includes(outcome.id);
                    const { qty, revenue } = calcOutcome(outcome.id, adjBiogasM3, adjTons, parsedPrices);
                    const hasData = adjBiogasM3 > 0;

                    return (
                      <button
                        key={outcome.id}
                        type="button"
                        onClick={() => handleToggleOutcome(outcome.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'bg-cp2b-green/10 border-cp2b-green ring-1 ring-cp2b-green'
                            : 'bg-white border-gray-200 hover:border-cp2b-green'
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0 leading-none">{outcome.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${selected ? 'text-cp2b-dark-green' : 'text-gray-800'}`}>
                            {outcome.label}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{outcome.desc}</p>
                        </div>
                        {hasData ? (
                          <div className="text-right flex-shrink-0 min-w-[90px]">
                            <p className="text-xs text-gray-400">{fmtQty(qty, outcome.unit)}</p>
                            <p className={`text-sm font-bold tabular-nums ${selected ? 'text-cp2b-dark-green' : 'text-gray-700'}`}>
                              {fmtBRL(revenue)}<span className="text-xs font-normal text-gray-400">/ano</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 flex-shrink-0 italic">insira qtd.</p>
                        )}
                        {selected && <CheckCircle2 className="h-4 w-4 text-cp2b-green flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section B — Purification tech (only when fuel is selected) */}
              {businessOutcomes.includes('fuel') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                    🔬 {t('purification_label')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PURIFICATION_OPTS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setUpgradingTechId(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                          upgradingTechId === opt.id
                            ? 'bg-blue-100 border-blue-400 text-blue-800 font-semibold'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section C — Digester + Pre-treatment (requires API data) */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                {loadingTech ? (
                  <p className="text-center text-sm text-gray-400 py-2">{t('loading_technologies')}</p>
                ) : technologies.length === 0 ? (
                  <p className="text-center text-sm text-red-500 py-2">{t('no_technologies_found')}</p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('digester_label')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={digesterTechnologyId}
                        onChange={e => setDigesterTechnologyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent"
                      >
                        <option value="">{t('digester_placeholder')}</option>
                        {digesters.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.emoji} {tech.namePt}</option>
                        ))}
                      </select>
                    </div>

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
                          <option key={tech.id} value={tech.id}>{tech.emoji} {tech.namePt}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Section D — Price overrides (collapsible, SP baselines as placeholders) */}
              <details className="border border-dashed border-gray-300 rounded-xl group">
                <summary className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none list-none flex items-center justify-between">
                  <span>💰 {t('price_overrides_label')}</span>
                  <span className="text-gray-400">▸</span>
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-2.5">
                  <p className="text-xs text-gray-400 mb-3">
                    Padrão: médias SP 2025–2026. Deixe em branco para usar referências automáticas.
                  </p>
                  {TARIFF_ROWS.map(row => (
                    <div key={row.key} className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 w-36 shrink-0">
                        {row.icon} {OUTCOMES.find(o => o.priceKey === row.key)?.label}
                      </label>
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number"
                          value={tariffValues[row.key] ?? ''}
                          min={0}
                          step={row.step}
                          placeholder={String(SP_MARKET_BASELINES[row.key])}
                          onChange={e => setTariffValues(prev => ({ ...prev, [row.key]: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cp2b-green focus:border-transparent"
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">{row.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>

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
