import { fireEvent, render, screen } from '@testing-library/react';

import ThematicMapBar from './ThematicMapBar';

describe('ThematicMapBar', () => {
  it('keeps agriculture available while disabling unvalidated MG sectors', () => {
    const onApplyPreset = jest.fn();
    render(
      <ThematicMapBar
        onApplyPreset={onApplyPreset}
        disabledBiomassTypes={['livestock', 'urban']}
        disabledResidues={['cattle', 'swine', 'poultry', 'aquaculture', 'rsu', 'rpo', 'sewage']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Setoriais/ }));

    expect(screen.getByRole('option', { name: /Agrícola/ })).toBeEnabled();
    expect(screen.getByRole('option', { name: /Pecuária/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: /Urbano/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('option', { name: /Agrícola/ }));
    expect(onApplyPreset).toHaveBeenCalledWith(expect.objectContaining({ id: 'agricola' }));

    fireEvent.click(screen.getByRole('button', { name: /Por resíduo/ }));
    expect(screen.getByRole('option', { name: /Cana-de-açúcar/ })).toBeEnabled();
    expect(screen.getByRole('option', { name: /Bovinos/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: /FORSU/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: /Poda urbana/ })).toBeDisabled();
    expect(screen.getByRole('option', { name: /Lodo de ETE/ })).toBeDisabled();
  });
});
