'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { useComparison } from '@/contexts/ComparisonContext';

export default function ComparisonBar() {
  const router = useRouter();
  const { selectedMunicipalities, removeMunicipality, clearComparison } = useComparison();

  if (selectedMunicipalities.length === 0) {
    return null;
  }

  const handleCompare = () => {
    const ids = selectedMunicipalities.map((m) => m.id).join(',');
    router.push(`/dashboard/compare?ids=${ids}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-600 shadow-2xl z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Selected municipalities */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Comparar ({selectedMunicipalities.length}/4):
            </span>

            <div className="flex gap-2">
              {selectedMunicipalities.map((municipality) => (
                <div
                  key={municipality.id}
                  className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm whitespace-nowrap"
                >
                  <span>{municipality.name}</span>
                  <button
                    onClick={() => removeMunicipality(municipality.id)}
                    className="hover:text-green-900 transition-colors"
                    aria-label={`Remove ${municipality.name}`}
                  >
                    <X className="h-4 w-4" />
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
              Limpar
            </button>

            <button
              onClick={handleCompare}
              disabled={selectedMunicipalities.length < 2}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              Comparar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selectedMunicipalities.length < 2 && (
          <p className="text-xs text-gray-500 mt-2">
            Selecione pelo menos 2 municípios para comparar
          </p>
        )}
      </div>
    </div>
  );
}
