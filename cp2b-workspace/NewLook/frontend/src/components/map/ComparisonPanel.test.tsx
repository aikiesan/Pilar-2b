/**
 * The comparison panel is a modal dialog: named by its title, closed by Escape.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ComparisonPanel from './ComparisonPanel';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

describe('ComparisonPanel', () => {
  it('is a modal dialog named by its title, and Escape closes it', () => {
    const onClose = jest.fn();
    render(
      <ComparisonPanel
        municipalities={[]}
        selectedMunicipalities={[]}
        onMunicipalityAdd={() => {}}
        onMunicipalityRemove={() => {}}
        onClose={onClose}
        visible
      />
    );
    expect(screen.getByRole('dialog', { name: 'Comparação de Municípios' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', () => {
    const { container } = render(
      <ComparisonPanel
        municipalities={[]}
        selectedMunicipalities={[]}
        onMunicipalityAdd={() => {}}
        onMunicipalityRemove={() => {}}
        onClose={() => {}}
        visible={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
