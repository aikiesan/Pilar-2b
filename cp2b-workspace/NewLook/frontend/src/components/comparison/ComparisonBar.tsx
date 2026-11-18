'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { X, ArrowRight } from 'lucide-react';
import { useRouter } from '@/navigation';
import { MAX_COMPARISON, MIN_COMPARISON, useComparison } from '@/contexts/ComparisonContext';
import { useHasTabBar } from '@/components/layout/fullViewport';

export default function ComparisonBar() {
  const t = useTranslations('comparison');
  const tCommon = useTranslations('common');
  // Locale-aware: keeps the user in their language on the compare page.
  const router = useRouter();
  const { selectedMunicipalities, removeMunicipality, clearComparison } = useComparison();
  // Above the phone bottom bar where there is one.
  const hasTabBar = useHasTabBar();

  if (selectedMunicipalities.length === 0) {
    return null;
  }

  const handleCompare = () => {
    const ids = selectedMunicipalities.map((m) => m.id).join(',');
    router.push(`/compare?ids=${ids}`);
  };

  return (
    <div className={`fixed ${hasTabBar ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0' : 'bottom-0'} left-0 right-0 bg-white border-t-2 border-terra-600 shadow-2xl z-50 transition-all`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Selected municipalities */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {t('selected', { count: selectedMunicipalities.length, max: MAX_COMPARISON })}
            </span>

            <div className="flex gap-2">
              {selectedMunicipalities.map((municipality) => (
                <div
                  key={municipality.id}
                  className="flex items-center gap-2 bg-terra-100 text-terra-800 px-3 py-1 rounded-sm text-sm whitespace-nowrap"
                >
                  <span>{municipality.name}</span>
                  <button
                    onClick={() => removeMunicipality(municipality.id)}
                    className="hover:text-terra-900 transition-colors"
                    aria-label={t('remove', { name: municipality.name })}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={clearComparison}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              {tCommon('actions.clear')}
            </button>

            <button
              onClick={handleCompare}
              disabled={selectedMunicipalities.length < MIN_COMPARISON}
              className="flex items-center gap-2 px-6 py-2 bg-terra-700 hover:bg-terra-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              {t('compare')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {selectedMunicipalities.length < MIN_COMPARISON && (
          <p className="text-xs text-gray-500 mt-2">
            {t('min_hint', { min: MIN_COMPARISON })}
          </p>
        )}
      </div>
    </div>
  );
}
