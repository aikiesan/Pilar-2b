'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';

/** How many municipalities a comparison holds. */
export const MIN_COMPARISON = 2;
export const MAX_COMPARISON = 4;

interface Municipality {
  id: number;
  name: string;
  total_biogas_m3_year?: number;
  region?: string;
}

interface ComparisonContextType {
  selectedMunicipalities: Municipality[];
  addMunicipality: (municipality: Municipality) => void;
  removeMunicipality: (id: number) => void;
  clearComparison: () => void;
  isSelected: (id: number) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<Municipality[]>([]);
  const { addToast } = useToast();
  const t = useTranslations('comparison');

  const addMunicipality = useCallback((municipality: Municipality) => {
    if (selectedMunicipalities.some((m) => m.id === municipality.id)) return;
    // The warning is raised here, not inside the state updater: React may run
    // an updater twice (Strict Mode), which showed the toast twice.
    if (selectedMunicipalities.length >= MAX_COMPARISON) {
      addToast(t('limit', { max: MAX_COMPARISON }), 'warning');
      return;
    }
    // The updater re-checks, in case two adds land before a re-render.
    setSelectedMunicipalities((prev) =>
      prev.length >= MAX_COMPARISON || prev.some((m) => m.id === municipality.id)
        ? prev
        : [...prev, municipality]
    );
  }, [selectedMunicipalities, addToast, t]);

  const removeMunicipality = useCallback((id: number) => {
    setSelectedMunicipalities((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedMunicipalities([]);
  }, []);

  const isSelected = useCallback(
    (id: number) => {
      return selectedMunicipalities.some((m) => m.id === id);
    },
    [selectedMunicipalities]
  );

  const value = useMemo(
    () => ({
      selectedMunicipalities,
      addMunicipality,
      removeMunicipality,
      clearComparison,
      isSelected,
    }),
    [selectedMunicipalities, addMunicipality, removeMunicipality, clearComparison, isSelected]
  );

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
