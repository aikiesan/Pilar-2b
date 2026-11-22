/**
 * The beta colour modes (typology, C/N profile, nutrient regime) are shown only
 * to a visitor with a real session. Without one they are left out entirely,
 * with no locked buttons and no hint; and a selector with a single mode left
 * is not shown at all.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ColorModeSelector, { type ColorModeOption } from './ColorModeSelector';

let mockHasBeta = false;
jest.mock('@/lib/betaAccess', () => ({ useBetaAccess: () => mockHasBeta }));

const OPTIONS: ColorModeOption[] = [
  { value: 'biogas', label: 'Potencial Biomassa', beta: false },
  { value: 'tipologia', label: 'Tipologia de resíduo', beta: true },
  { value: 'cn_profile', label: 'Perfil C/N', beta: true },
  { value: 'regime', label: 'Regime de nutrientes', beta: true },
];

const renderSelector = () =>
  render(
    <ColorModeSelector
      label="Modo Coroplético"
      colorMode="biogas"
      onColorModeChange={jest.fn()}
      options={OPTIONS}
      lockedHint="Camada beta em teste — entre para visualizar."
    />,
  );

describe('ColorModeSelector', () => {
  beforeEach(() => { mockHasBeta = false; });

  it('leaves the beta modes, their hint and the selector out without a session', () => {
    renderSelector();
    expect(screen.queryByText('Tipologia de resíduo')).not.toBeInTheDocument();
    expect(screen.queryByText('Perfil C/N')).not.toBeInTheDocument();
    expect(screen.queryByText('Regime de nutrientes')).not.toBeInTheDocument();
    expect(screen.queryByText(/entre para visualizar/)).not.toBeInTheDocument();
    expect(screen.queryByText('Modo Coroplético')).not.toBeInTheDocument();
  });

  it('shows every mode under its label with a session', () => {
    mockHasBeta = true;
    renderSelector();
    expect(screen.getByText('Modo Coroplético')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tipologia de resíduo/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Perfil C\/N/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Regime de nutrientes/ })).toBeEnabled();
  });
});
