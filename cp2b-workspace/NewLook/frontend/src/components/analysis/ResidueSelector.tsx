'use client';

import { useState } from 'react';
import { Wheat, Beef, Building2, Check, ChevronDown, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DETAILED_RESIDUES, getResiduesByCategory, getParentCrop } from '@/data/residueFactors';

export type ResidueCategory = 'agricultural' | 'livestock' | 'urban';

interface ResidueSelectorProps {
  selectedCategory: ResidueCategory;
  selectedResidueCodes: string[];
  onCategoryChange: (category: ResidueCategory) => void;
  onResidueCodesChange: (codes: string[]) => void;
  onApply: () => void;
}

// Group residues by parent crop (for agricultural) or by type
interface ResidueGroup {
  id: string;
  label: string;
  residues: Array<{
    code: string;
    name: string;
    fde: number;
    classification: string;
    confidence: string;
    observation?: string;
  }>;
}

export default function ResidueSelector({
  selectedCategory,
  selectedResidueCodes,
  onCategoryChange,
  onResidueCodesChange,
  onApply
}: ResidueSelectorProps) {
  const t = useTranslations('analysis')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Get residues for current category
  const categoryResidues = getResiduesByCategory(selectedCategory);

  // Group residues
  const residueGroups: ResidueGroup[] = (() => {
    if (selectedCategory === 'agricultural') {
      // Group by parent crop
      const grouped = new Map<string, typeof categoryResidues>();
      categoryResidues.forEach(residue => {
        const parent = getParentCrop(residue.code);
        if (!grouped.has(parent)) {
          grouped.set(parent, []);
        }
        grouped.get(parent)!.push(residue);
      });

      return Array.from(grouped.entries()).map(([parent, residues]) => ({
        id: parent.toLowerCase().replace(/\s+/g, '-'),
        label: `${parent} (${residues.length} resíduos)`,
        residues: residues.map(r => ({
          code: r.code,
          name: r.name,
          fde: r.fde,
          classification: r.classification,
          confidence: r.confidence,
          observation: r.observation
        }))
      }));
    } else {
      // For livestock and urban, create a single "all" group
      return [{
        id: 'all',
        label: selectedCategory === 'livestock' ? t('residue_selector.livestock') : t('residue_selector.urban'),
        residues: categoryResidues.map(r => ({
          code: r.code,
          name: r.name,
          fde: r.fde,
          classification: r.classification,
          confidence: r.confidence,
          observation: r.observation
        }))
      }];
    }
  })();

  // Handle category tab click
  const handleCategoryClick = (category: ResidueCategory) => {
    onCategoryChange(category);
    // Clear selection when changing category
    onResidueCodesChange([]);
    // Auto-expand groups for agricultural category
    if (category === 'agricultural') {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(['all']));
    }
  };

  // Toggle individual residue
  const toggleResidue = (residueCode: string) => {
    if (selectedResidueCodes.includes(residueCode)) {
      onResidueCodesChange(selectedResidueCodes.filter(r => r !== residueCode));
    } else {
      onResidueCodesChange([...selectedResidueCodes, residueCode]);
    }
  };

  // Toggle all residues in a group (select/deselect)
  const toggleGroupSelection = (groupId: string) => {
    const group = residueGroups.find(g => g.id === groupId);
    if (!group) return;

    const groupCodes = group.residues.map(r => r.code);
    const allSelected = groupCodes.every(code => selectedResidueCodes.includes(code));

    if (allSelected) {
      // Deselect all in group
      onResidueCodesChange(selectedResidueCodes.filter(code => !groupCodes.includes(code)));
    } else {
      // Select all in group
      const newSelection = [...new Set([...selectedResidueCodes, ...groupCodes])];
      onResidueCodesChange(newSelection);
    }
  };

  // Select all residues
  const selectAll = () => {
    const allCodes = residueGroups.flatMap(g => g.residues.map(r => r.code));
    onResidueCodesChange(allCodes);
  };

  // Clear all residues
  const clearAll = () => {
    onResidueCodesChange([]);
  };

  // Get classification emoji and label
  const getClassificationDisplay = (classification: string) => {
    if (classification.includes('EXCEPCIONAL')) return { emoji: '🟢', label: 'EXCEPCIONAL', color: 'text-green-600' };
    if (classification.includes('MUITO BOM')) return { emoji: '🟢', label: 'MUITO BOM', color: 'text-green-600' };
    if (classification.includes('BOM')) return { emoji: '🟡', label: 'BOM', color: 'text-yellow-600' };
    if (classification.includes('RAZOÁVEL')) return { emoji: '🟡', label: 'RAZOÁVEL', color: 'text-yellow-600' };
    if (classification.includes('REGULAR')) return { emoji: '🟠', label: 'REGULAR', color: 'text-orange-600' };
    if (classification.includes('INVIÁVEL')) return { emoji: '⚫', label: 'INVIÁVEL', color: 'text-gray-600' };
    return { emoji: '⚪', label: 'N/A', color: 'text-gray-400' };
  };

  // Get confidence badge color
  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'HIGH') return 'bg-green-100 text-green-700 border-green-300';
    if (confidence === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const categoryConfig = {
    agricultural: { label: t('residue_selector.category_label_agricultural'), icon: <Wheat className="w-4 h-4" /> },
    livestock: { label: t('residue_selector.category_label_livestock'), icon: <Beef className="w-4 h-4" /> },
    urban: { label: t('residue_selector.category_label_urban'), icon: <Building2 className="w-4 h-4" /> }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
        {t('residue_selector.filter_title')}
      </h3>

      {/* Category Tabs */}
      <div className="flex flex-col gap-2 mb-4">
        {(Object.keys(categoryConfig) as ResidueCategory[]).map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`flex items-center gap-3 px-4 py-3 font-medium text-sm rounded-lg transition-all ${
              selectedCategory === category
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {categoryConfig[category].icon}
            {categoryConfig[category].label}
          </button>
        ))}
      </div>

      {/* Residue Groups */}
      <div className="space-y-2 mb-4 pt-3 border-t border-gray-100 max-h-[500px] overflow-y-auto">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
          {selectedCategory === 'agricultural' ? t('residue_selector.agricultural_crops') : t('residue_selector.residue_types')}
        </h4>

        {residueGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const groupCodes = group.residues.map(r => r.code);
          const selectedCount = groupCodes.filter(code => selectedResidueCodes.includes(code)).length;
          const allSelected = selectedCount === groupCodes.length;

          return (
            <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div
                className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
                  isExpanded ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  const newExpanded = new Set(expandedGroups);
                  if (newExpanded.has(group.id)) {
                    newExpanded.delete(group.id);
                  } else {
                    newExpanded.add(group.id);
                  }
                  setExpandedGroups(newExpanded);
                }}
              >
                {/* Expand/Collapse Icon */}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}

                {/* Group Checkbox (only show for agricultural with multiple residues) */}
                {selectedCategory === 'agricultural' && (
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      allSelected
                        ? 'bg-green-600 border-green-600'
                        : selectedCount > 0
                        ? 'bg-green-200 border-green-600'
                        : 'border-gray-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupSelection(group.id);
                    }}
                  >
                    {allSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    {selectedCount > 0 && !allSelected && (
                      <div className="w-2 h-2 bg-green-600 rounded-sm" />
                    )}
                  </div>
                )}

                {/* Group Label */}
                <span className="flex-1 text-sm font-medium text-gray-800">{group.label}</span>

                {/* Selection Count Badge */}
                {selectedCount > 0 && (
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                    {selectedCount}
                  </span>
                )}
              </div>

              {/* Group Residues */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white">
                  {group.residues.map(residue => {
                    const isSelected = selectedResidueCodes.includes(residue.code);
                    const classDisplay = getClassificationDisplay(residue.classification);
                    const isInviable = residue.fde === 0;

                    return (
                      <label
                        key={residue.code}
                        className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all group ${
                          isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected
                              ? 'bg-green-600 border-green-600 scale-105'
                              : 'border-gray-300 group-hover:border-green-400'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleResidue(residue.code);
                          }}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </div>

                        {/* Residue Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {residue.name}
                            </span>
                            {isInviable && (
                              <span className="group relative">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {t('residue_selector.not_viable')}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* FDE and Classification */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold ${
                              isInviable ? 'text-red-600' : 'text-green-700'
                            }`}>
                              FDE: {residue.fde.toFixed(2)}%
                            </span>
                            <span className={`text-xs ${classDisplay.color}`}>
                              {classDisplay.emoji} {classDisplay.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 border rounded ${getConfidenceBadge(residue.confidence)}`}>
                              {residue.confidence}
                            </span>
                          </div>

                          {/* Observation (if exists) */}
                          {residue.observation && (
                            <div className="mt-1 flex items-start gap-1 text-xs text-gray-600">
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{residue.observation}</span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="flex-1 px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            {t('residue_selector.select_all')}
          </button>
          <button
            onClick={clearAll}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('residue_selector.clear')}
          </button>
        </div>
        <button
          onClick={onApply}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
        >
          {t('residue_selector.apply_filter')}
        </button>
      </div>

      {/* Selection Info */}
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          {selectedResidueCodes.length === 0 ? (
            <span>{t('residue_selector.none_selected')}</span>
          ) : (
            <span>{t('residue_selector.selected_count', { count: selectedResidueCodes.length })}</span>
          )}
        </p>
      </div>
    </div>
  );
}
