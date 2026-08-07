/**
 * The plants legend must describe exactly the plant layers that are on.
 *
 * It used to be a fixed list of four types rendered whenever the biogás layer
 * was switched on: Biodiesel was missing entirely, and etanol / biometano / UTE
 * were claimed to be on screen when they were not.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BiomassLayerLegend from './BiomassLayerLegend';
import { PLANT_LAYERS } from '@/lib/plantLayers';

describe('BiomassLayerLegend', () => {
  it('renders nothing when no plant layer is on', () => {
    const { container } = render(<BiomassLayerLegend layerIds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('describes only the plant layer that is on', () => {
    render(<BiomassLayerLegend layerIds={['biogas_plant']} />);

    expect(screen.getByText('Biogás')).toBeInTheDocument();
    expect(screen.queryByText('Etanol')).not.toBeInTheDocument();
    expect(screen.queryByText('Biomassa UTE')).not.toBeInTheDocument();
    expect(screen.queryByText('Biodiesel')).not.toBeInTheDocument();
  });

  it('covers every national plant layer, Biodiesel included', () => {
    render(
      <BiomassLayerLegend
        layerIds={['biogas_plant', 'ethanol_plant', 'biomass_thermal_plant', 'biodiesel_plant']}
      />
    );

    expect(screen.getByText('Biogás')).toBeInTheDocument();
    expect(screen.getByText('Etanol')).toBeInTheDocument();
    expect(screen.getByText('Biomassa UTE')).toBeInTheDocument();
    expect(screen.getByText('Biodiesel')).toBeInTheDocument();
  });

  it('expands the legacy SP layer into the subtypes it draws', () => {
    render(<BiomassLayerLegend layerIds={['biogas-plants']} />);

    // That one shapefile differentiates its markers by SUBTIPO, so all four
    // are genuinely on screen under a single layer id.
    expect(screen.getByText('Etanol')).toBeInTheDocument();
    expect(screen.getByText('Biogás')).toBeInTheDocument();
    expect(screen.getByText('Biometano')).toBeInTheDocument();
    expect(screen.getByText('Biomassa UTE')).toBeInTheDocument();
  });

  it('lists a type once when two layers contribute it', () => {
    render(<BiomassLayerLegend layerIds={['biogas-plants', 'biogas_plant']} />);
    expect(screen.getAllByText('Biogás')).toHaveLength(1);
  });

  it('ignores layers that are not plants', () => {
    const { container } = render(
      <BiomassLayerLegend layerIds={['substation', 'gas_pipeline_transport']} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('gives biodiesel a colour of its own', () => {
    // It was drawn with the biometano marker, putting one plant type on the
    // map under another type's colour.
    expect(PLANT_LAYERS.biodiesel_plant.color).not.toBe('#3498DB');
    const colors = Object.values(PLANT_LAYERS).map((p) => p.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
