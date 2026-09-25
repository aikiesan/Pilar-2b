/**
 * Each crop group's header has two controls side by side: a "select all"
 * checkbox and a button that expands the group. The checkbox used to sit inside
 * a role="button" row (axe: nested-interactive), where a screen reader cannot
 * reach it as a control of its own.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import SimpleResidueSelector from './SimpleResidueSelector';
import { getParentCrop, getResiduesByCategory } from '@/data/residueFactors';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

// Two residues of the same crop, so selecting one leaves the group partly selected.
const agricultural = getResiduesByCategory('agricultural');
const crop = agricultural.map((r) => getParentCrop(r.code)).find(
  (parent, _, all) => parent !== 'other' && all.filter((p) => p === parent).length > 1
)!;
const [first] = agricultural.filter((r) => getParentCrop(r.code) === crop);

function renderSelector(selected: string[] = []) {
  return render(
    <SimpleResidueSelector
      selectedCategory="agricultural"
      selectedResidueCodes={selected}
      onCategoryChange={() => {}}
      onResidueCodesChange={() => {}}
      onApply={() => {}}
    />
  );
}

describe('SimpleResidueSelector group header', () => {
  it('has no nested controls', async () => {
    const { container } = renderSelector([first.code]);
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox.closest('button, [role="button"]')).toBeNull();
    }
    expect(await axe(container)).toHaveNoViolations();
  });

  it('reports a partly selected group as mixed', () => {
    renderSelector([first.code]);
    const mixed = screen
      .getAllByRole('checkbox')
      .filter((box) => box.getAttribute('aria-checked') === 'mixed');
    expect(mixed).toHaveLength(1);
  });

  it('expands a group from its own button', () => {
    renderSelector();
    const [toggle] = screen.getAllByRole('button', { expanded: false });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
