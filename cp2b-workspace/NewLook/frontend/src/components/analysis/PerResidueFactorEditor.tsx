'use client';

import { useState, useMemo } from 'react';
import { RotateCcw, Info, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getResidueByCode } from '@/data/residueFactors';
import { CorrectionFactors, calculateFDE, ResidueFactorOverrides } from '@/types/analysis';

interface PerResidueFactorEditorProps {
  selectedResidueCodes: string[];
  factorOverrides: ResidueFactorOverrides;
  onChange: (overrides: ResidueFactorOverrides) => void;
  showAggregatedFDE?: boolean;
}

export default function PerResidueFactorEditor({
  selectedResidueCodes,
  factorOverrides,
  onChange,
  showAggregatedFDE = true
}: PerResidueFactorEditorProps) {
  const t = useTranslations('analysis')
  const [activeTab, setActiveTab] = useState<string>(selectedResidueCodes[0] || '');

  // Get residue details
  const residues = useMemo(() => {
    return selectedResidueCodes
      .map(code => getResidueByCode(code))
      .filter(r => r !== undefined);
  }, [selectedResidueCodes]);

  // Set active tab when residues change
  useMemo(() => {
    if (selectedResidueCodes.length > 0 && !selectedResidueCodes.includes(activeTab)) {
      setActiveTab(selectedResidueCodes[0]);
    }
  }, [selectedResidueCodes, activeTab]);

  // Get effective factors for a residue (override or default)
  const getEffectiveFactors = (residueCode: string): CorrectionFactors => {
    if (factorOverrides[residueCode]) {
      return factorOverrides[residueCode]!;
    }
    const residue = getResidueByCode(residueCode);
    if (residue) {
      return {
        fc: residue.fc,
        fcp: residue.fcp,
        fs: residue.fs,
        fl: residue.fl
      };
    }
    return { fc: 0.85, fcp: 0.3, fs: 0.85, fl: 0.8 };
  };

  // Handle factor change for a specific residue
  const handleFactorChange = (residueCode: string, factorKey: keyof CorrectionFactors, value: number) => {
    const currentFactors = getEffectiveFactors(residueCode);
    const newFactors = { ...currentFactors, [factorKey]: value };
    onChange({ ...factorOverrides, [residueCode]: newFactors });
  };

  // Reset factors for a residue to default
  const resetToDefault = (residueCode: string) => {
    const newOverrides = { ...factorOverrides };
    delete newOverrides[residueCode];
    onChange(newOverrides);
  };

  // Calculate weighted average FDE
  const weightedFDE = useMemo(() => {
    if (!showAggregatedFDE || selectedResidueCodes.length === 0) return null;

    // For simplicity, assuming equal weight (in real scenario, would use actual potentials)
    let totalFDE = 0;
    selectedResidueCodes.forEach(code => {
      const factors = getEffectiveFactors(code);
      totalFDE += calculateFDE(factors);
    });
    return (totalFDE / selectedResidueCodes.length) * 100;
  }, [selectedResidueCodes, factorOverrides, showAggregatedFDE]);

  // Factor configuration for sliders
  const factorConfig: Array<{
    key: keyof CorrectionFactors;
    label: string;
    description: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }> = [
    {
      key: 'fc',
      label: t('per_residue_editor.fc_label'),
      description: t('per_residue_editor.fc_desc'),
      min: 0,
      max: 1,
      step: 0.01,
      format: (v) => `${(v * 100).toFixed(0)}%`
    },
    {
      key: 'fcp',
      label: t('per_residue_editor.fcp_label'),
      description: t('per_residue_editor.fcp_desc'),
      min: 0,
      max: 1,
      step: 0.01,
      format: (v) => `${(v * 100).toFixed(0)}%`
    },
    {
      key: 'fs',
      label: t('per_residue_editor.fs_label'),
      description: t('per_residue_editor.fs_desc'),
      min: 0,
      max: 1,
      step: 0.01,
      format: (v) => `${(v * 100).toFixed(0)}%`
    },
    {
      key: 'fl',
      label: t('per_residue_editor.fl_label'),
      description: t('per_residue_editor.fl_desc'),
      min: 0,
      max: 1,
      step: 0.01,
      format: (v) => `${(v * 100).toFixed(0)}%`
    }
  ];

  if (selectedResidueCodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="text-center py-8">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            {t('per_residue_editor.empty_state')}
          </p>
        </div>
      </div>
    );
  }

  const activeResidue = getResidueByCode(activeTab);
  const activeFactors = getEffectiveFactors(activeTab);
  const activeFDE = calculateFDE(activeFactors) * 100;
  const isCustom = factorOverrides[activeTab] !== undefined;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
          {t('per_residue_editor.title')}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {t('per_residue_editor.subtitle')}
        </p>
      </div>

      {/* Dropdown Content */}
      <div className="p-3 space-y-4">
        {/* Residue Selector Dropdown */}
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full p-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
        >
          {residues.map((residue) => {
            if (!residue) return null;
            const hasOverride = factorOverrides[residue.code] !== undefined;
            return (
              <option key={residue.code} value={residue.code}>
                {residue.name} {hasOverride ? t('per_residue_editor.modified_label') : ''}
              </option>
            );
          })}
        </select>

        {activeResidue && (
          <>
            {/* Residue Info - RESTRUCTURED */}
            <div className="pb-4 border-b border-gray-100">
              <div className="flex flex-col items-start gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 break-words">{activeResidue.name}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{t('per_residue_editor.code_label')} {activeResidue.code}</p>
                </div>
                {isCustom && (
                  <button
                    onClick={() => resetToDefault(activeTab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('per_residue_editor.restore_default')}
                  </button>
                )}
              </div>

              {/* Current FDE Display - REDUCED FONT */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">{t('per_residue_editor.current_fde')}</span>
                  <span className="text-base font-bold text-purple-700">{activeFDE.toFixed(2)}%</span>
                </div>
                {activeResidue.fde !== activeFDE && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span>{t('per_residue_editor.default_fde', { value: activeResidue.fde.toFixed(2) })}</span>
                  </div>
                )}
              </div>

              {/* Confidence Badge */}
              <div className="mt-2">
                <span className={`inline-block text-[10px] px-2 py-1 border rounded ${
                  activeResidue.confidence === 'HIGH' ? 'bg-green-100 text-green-700 border-green-300' :
                  activeResidue.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                  'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {t('per_residue_editor.confidence_label')} {activeResidue.confidence}
                </span>
              </div>
            </div>

            {/* Factor Sliders - REDUCED SPACING */}
            <div className="space-y-4">
              {factorConfig.map((config) => {
                const value = activeFactors[config.key];
                const defaultValue = getResidueByCode(activeTab)?.[config.key] || 0;
                const isModified = isCustom && value !== defaultValue;
                const justificationKey = `${config.key}Justification` as keyof typeof activeResidue;
                const justification = activeResidue[justificationKey] as string || '';

                return (
                  <div key={config.key} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                          {config.label}
                        </label>
                        {justification && (
                          <div className="group relative">
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            {/* TOOLTIP POSITION FIX */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[200px]" style={{whiteSpace: 'normal'}}>
                              {justification}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isModified ? 'text-purple-700' : 'text-gray-900'}`}>
                          {config.format(value)}
                        </span>
                        {isModified && (
                          <span className="text-xs text-purple-600">{t('per_residue_editor.mod_short')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={value}
                        onChange={(e) => handleFactorChange(activeTab, config.key, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                      />
                    </div>

                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                );
              })}
            </div>

            {/* FDE Formula Display */}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-700" />
                <span className="text-sm font-semibold text-purple-900">{t('per_residue_editor.fde_calc_heading')}</span>
              </div>
              <div className="text-xs text-gray-700 font-mono break-words">
                FDE = FC × (1 - FCp) × FS × FL
              </div>
              <div className="text-xs text-gray-700 font-mono mt-1 break-all">
                FDE = {(activeFactors.fc * 100).toFixed(0)}% × {((1 - activeFactors.fcp) * 100).toFixed(0)}% × {(activeFactors.fs * 100).toFixed(0)}% × {(activeFactors.fl * 100).toFixed(0)}% = {activeFDE.toFixed(2)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Weighted FDE Summary (if multiple residues) */}
      {showAggregatedFDE && selectedResidueCodes.length > 1 && weightedFDE !== null && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('per_residue_editor.weighted_fde')}</span>
            <span className="text-lg font-bold text-purple-700">{weightedFDE.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {t('per_residue_editor.based_on_count', { count: selectedResidueCodes.length })}
          </p>
        </div>
      )}

      {/* Custom Styles for Purple Slider */}
      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
        }

        .slider-purple::-webkit-slider-thumb:hover {
          background: #7C3AED;
          box-shadow: 0 3px 6px rgba(139, 92, 246, 0.4);
        }

        .slider-purple::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B5CF6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
        }

        .slider-purple::-moz-range-thumb:hover {
          background: #7C3AED;
          box-shadow: 0 3px 6px rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
