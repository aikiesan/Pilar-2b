'use client';

/**
 * Simple Residue Selector - Clean version without FDE/quality badges
 * For use in the analysis page where graphs are the main focus
 */

import { useState } from 'react';
import { Wheat, Beef, Building2, Factory, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getResiduesByCategory, getParentCrop } from '@/data/residueFactors';

export type ResidueCategory = 'agricultural' | 'livestock' | 'urban' | 'industrial';

interface SimpleResidueSelectorProps {
  selectedCategory: ResidueCategory;
  selectedResidueCodes: string[];
  onCategoryChange: (category: ResidueCategory) => void;
  onResidueCodesChange: (codes: string[]) => void;
  onApply: () => void;
}

interface ResidueGroup {
  id: string;
  label: string;
  residues: Array<{
    code: string;
    name: string;
  }>;
}

export default function SimpleResidueSelector({
  selectedCategory,
  selectedResidueCodes,
  onCategoryChange,
  onResidueCodesChange,
  onApply
}: SimpleResidueSelectorProps) {
  const t = useTranslations('analysis')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Get residues for current category
  const categoryResidues = getResiduesByCategory(selectedCategory);

  // Group residues
  const residueGroups: ResidueGroup[] = (() => {
    if (selectedCategory === 'agricultural') {
      // Group by parent crop for agricultural only
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
        label: parent,
        residues: residues.map(r => ({
          code: r.code,
          name: r.name
        }))
      }));
    } else if (selectedCategory === 'industrial') {
      // For industrial, create a flat list with single group (no grouping display)
      return [{
        id: 'all',
        label: t('residue_selector.industrial'),
        residues: categoryResidues.map(r => ({
          code: r.code,
          name: r.name
        }))
      }];
    } else {
      // For livestock and urban, create a single "all" group
      return [{
        id: 'all',
        label: selectedCategory === 'livestock' ? t('residue_selector.livestock') : t('residue_selector.urban'),
        residues: categoryResidues.map(r => ({
          code: r.code,
          name: r.name
        }))
      }];
    }
  })();

  // Handle category change
  const handleCategoryClick = (category: ResidueCategory) => {
    onCategoryChange(category);
    onResidueCodesChange([]);
    if (category === 'agricultural') {
      // For agricultural (grouped), start collapsed
      setExpandedGroups(new Set());
    } else {
      // For livestock/urban/industrial, auto-expand the single group
      setExpandedGroups(new Set(['all']));
    }
  };

  // Toggle individual residue
  const toggleResidue = (residueCode: string) => {
    if (selectedResidueCodes.includes(residueCode)) {
      onResidueCodesChange(selectedResidueCodes.filter(c => c !== residueCode));
    } else {
      onResidueCodesChange([...selectedResidueCodes, residueCode]);
    }
  };

  // Toggle group selection
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

  // Category tabs
  const categories = [
    { id: 'agricultural' as const, label: t('residue_selector.category_label_agricultural'), icon: Wheat, color: 'green' },
    { id: 'livestock' as const, label: t('residue_selector.category_label_livestock'), icon: Beef, color: 'orange' },
    { id: 'urban' as const, label: t('residue_selector.category_label_urban'), icon: Building2, color: 'blue' },
    { id: 'industrial' as const, label: t('residue_selector.industrial'), icon: Factory, color: 'purple' }
  ];

  const selectedCategoryInfo = categories.find(c => c.id === selectedCategory)!;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Category Tabs */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex flex-col items-center gap-1 py-3 transition-all ${
                isActive
                  ? `bg-${cat.color}-50 border-b-2 border-${cat.color}-600`
                  : 'hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? `text-${cat.color}-600` : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium ${isActive ? `text-${cat.color}-700` : 'text-gray-600'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Residue Groups */}
      <div className="max-h-[400px] overflow-y-auto">
        {residueGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const groupCodes = group.residues.map(r => r.code);
          const selectedCount = groupCodes.filter(code => selectedResidueCodes.includes(code)).length;
          const allSelected = selectedCount === groupCodes.length && groupCodes.length > 0;

          // For industrial, show flat list without group header
          if (selectedCategory === 'industrial') {
            return (
              <div key={group.id}>
                <div className="p-2 space-y-0.5">
                  {group.residues.map(residue => {
                    const isSelected = selectedResidueCodes.includes(residue.code);

                    return (
                      <label
                        key={residue.code}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          isSelected ? 'bg-green-100 border border-green-300' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleResidue(residue.code);
                          }}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>

                        <span className="text-xs text-gray-700">{residue.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={group.id} className="border-b border-gray-100 last:border-0">
              {/* Group Header */}
              <div
                className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
                  isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
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
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                )}

                {selectedCategory === 'agricultural' && (
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
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
                    {allSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    {selectedCount > 0 && !allSelected && (
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-sm" />
                    )}
                  </div>
                )}

                <span className="flex-1 text-xs font-medium text-gray-800">{group.label}</span>

                {selectedCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-semibold rounded-full">
                    {selectedCount}
                  </span>
                )}
              </div>

              {/* Group Residues */}
              {isExpanded && (
                <div className="p-2 space-y-0.5 bg-gray-50">
                  {group.residues.map(residue => {
                    const isSelected = selectedResidueCodes.includes(residue.code);

                    return (
                      <label
                        key={residue.code}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          isSelected ? 'bg-green-100 border border-green-300' : 'hover:bg-white'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleResidue(residue.code);
                          }}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>

                        <span className="text-xs text-gray-700">{residue.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Summary & Apply */}
      {selectedResidueCodes.length > 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">
              {t('residue_selector.selected_count', { count: selectedResidueCodes.length })}
            </span>
            <button
              onClick={() => onResidueCodesChange([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {t('residue_selector.clear')}
            </button>
          </div>
          <button
            onClick={onApply}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            {t('residue_selector.apply_filters')}
          </button>
        </div>
      )}
    </div>
  );
}
