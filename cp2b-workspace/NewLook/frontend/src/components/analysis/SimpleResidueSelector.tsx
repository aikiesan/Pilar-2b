'use client';

/**
 * Simple Residue Selector - Clean version without FDE/quality badges
 * For use in the analysis page where graphs are the main focus
 */

import { useState } from 'react';
import { Wheat, Beef, Building2, Factory, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getResiduesByCategory, getParentCrop, type ParentCrop } from '@/data/residueFactors';
import { SECTOR_COLORS } from '@/data/sectorColors';
import { useLocalize } from '@/hooks/useLocalize';

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
  const tResidues = useTranslations('Map.residues')
  const localize = useLocalize()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Get residues for current category
  const categoryResidues = getResiduesByCategory(selectedCategory);

  // Group residues
  const residueGroups: ResidueGroup[] = (() => {
    if (selectedCategory === 'agricultural') {
      // Group by parent crop for agricultural only
      const grouped = new Map<ParentCrop, typeof categoryResidues>();
      categoryResidues.forEach(residue => {
        const parent = getParentCrop(residue.code);
        if (!grouped.has(parent)) {
          grouped.set(parent, []);
        }
        grouped.get(parent)!.push(residue);
      });

      // Groups are keyed by crop, so an expanded group stays open across languages.
      return Array.from(grouped.entries()).map(([parent, residues]) => ({
        id: parent,
        label: parent === 'other' ? t('residue_selector.other_crops') : tResidues(parent),
        residues: residues.map(r => ({
          code: r.code,
          name: localize(r.name)
        }))
      }));
    } else if (selectedCategory === 'industrial') {
      // For industrial, create a flat list with single group (no grouping display)
      return [{
        id: 'all',
        label: t('residue_selector.industrial'),
        residues: categoryResidues.map(r => ({
          code: r.code,
          name: localize(r.name)
        }))
      }];
    } else {
      // For livestock and urban, create a single "all" group
      return [{
        id: 'all',
        label: selectedCategory === 'livestock' ? t('residue_selector.livestock') : t('residue_selector.urban'),
        residues: categoryResidues.map(r => ({
          code: r.code,
          name: localize(r.name)
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
    { id: 'agricultural' as const, label: t('residue_selector.category_label_agricultural'), icon: Wheat },
    { id: 'livestock' as const, label: t('residue_selector.category_label_livestock'), icon: Beef },
    { id: 'urban' as const, label: t('residue_selector.category_label_urban'), icon: Building2 },
    { id: 'industrial' as const, label: t('residue_selector.industrial'), icon: Factory }
  ];

  const selectedCategoryInfo = categories.find(c => c.id === selectedCategory)!;

  return (
    <div className="surface-light bg-paper-raised rounded-xl shadow-md border border-line overflow-hidden">
      {/* Category Tabs */}
      <div className="grid grid-cols-4 border-b border-line">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              aria-pressed={isActive}
              className={`-mb-px flex flex-col items-center gap-1 border-b-2 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 ${
                isActive
                  ? 'border-terra-600 text-ink'
                  : 'border-transparent text-ink-muted hover:bg-paper-sunken hover:text-ink'
              }`}
            >
              {/* The sector's own colour marks its icon; industrial has none. */}
              <Icon
                className="h-4 w-4"
                aria-hidden="true"
                style={isActive && cat.id !== 'industrial' ? { color: SECTOR_COLORS[cat.id] } : undefined}
              />
              <span className="text-[10px] font-medium">
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
                          isSelected ? 'bg-paper-sunken border border-terra-600' : 'hover:bg-paper-sunken'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleResidue(residue.code)}
                          className="sr-only peer"
                        />
                        <div
                          aria-hidden="true"
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-terra-500 peer-focus-visible:ring-offset-1 ${
                            isSelected
                              ? 'bg-terra-600 border-terra-600'
                              : 'border-line-strong'
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>

                        <span className="text-xs text-ink">{residue.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={group.id} className="border-b border-line last:border-0">
              {/* Group Header: the "select all" checkbox and the expand button are
                  siblings. The checkbox used to sit inside a role="button" row,
                  where a screen reader cannot reach it as a control of its own. */}
              <div
                className={`flex items-center gap-2 p-3 transition-colors ${
                  isExpanded ? 'bg-paper-sunken' : 'hover:bg-paper-sunken'
                }`}
              >
                {selectedCategory === 'agricultural' && (
                  <div
                    role="checkbox"
                    aria-checked={allSelected ? true : selectedCount > 0 ? 'mixed' : false}
                    aria-label={t('residue_selector.select_all', { group: group.label })}
                    tabIndex={0}
                    className={`w-4 h-4 shrink-0 cursor-pointer rounded border-2 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-terra-500 focus-visible:ring-offset-1 ${
                      allSelected
                        ? 'bg-terra-600 border-terra-600'
                        : selectedCount > 0
                        ? 'bg-terra-200 border-terra-600'
                        : 'border-line-strong'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroupSelection(group.id);
                      }
                    }}
                    onClick={() => toggleGroupSelection(group.id)}
                  >
                    {allSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    {selectedCount > 0 && !allSelected && (
                      <div className="w-1.5 h-1.5 bg-terra-600 rounded-sm" />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => {
                    const newExpanded = new Set(expandedGroups);
                    if (newExpanded.has(group.id)) {
                      newExpanded.delete(group.id);
                    } else {
                      newExpanded.add(group.id);
                    }
                    setExpandedGroups(newExpanded);
                  }}
                  className="flex flex-1 items-center gap-2 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-500"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
                  )}

                  <span className="flex-1 text-xs font-medium text-ink">{group.label}</span>

                  {selectedCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-terra-700 text-white text-[10px] font-semibold tabular-nums">
                      {selectedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Group Residues */}
              {isExpanded && (
                <div className="p-2 space-y-0.5 bg-paper-sunken">
                  {group.residues.map(residue => {
                    const isSelected = selectedResidueCodes.includes(residue.code);

                    return (
                      <label
                        key={residue.code}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          isSelected ? 'bg-paper-sunken border border-terra-600' : 'hover:bg-paper-raised'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleResidue(residue.code)}
                          className="sr-only peer"
                        />
                        <div
                          aria-hidden="true"
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-terra-500 peer-focus-visible:ring-offset-1 ${
                            isSelected
                              ? 'bg-terra-600 border-terra-600'
                              : 'border-line-strong'
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>

                        <span className="text-xs text-ink">{residue.name}</span>
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
        <div className="p-3 bg-paper-sunken border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">
              {t('residue_selector.selected_count', { count: selectedResidueCodes.length })}
            </span>
            <button
              onClick={() => onResidueCodesChange([])}
              className="text-xs text-ink-muted hover:text-ink"
            >
              {t('residue_selector.clear')}
            </button>
          </div>
          <button
            onClick={onApply}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-terra-700 hover:bg-terra-800 rounded-lg transition-colors"
          >
            {t('residue_selector.apply_filters')}
          </button>
        </div>
      )}
    </div>
  );
}
