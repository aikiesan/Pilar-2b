import { fireEvent, render, screen } from '@testing-library/react';

import EnhancedTooltip from './EnhancedTooltip';
import MunicipalityProfilePanel from './MunicipalityProfilePanel';
import type { MunicipalityFeature } from '@/types/geospatial';

jest.mock('@/hooks/useGeospatialData', () => ({
  useMunicipalityMetrics: () => ({ data: undefined, isLoading: false, error: null }),
}));

jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const municipality = (uf: 'SP' | 'MG'): MunicipalityFeature => {
  const isMg = uf === 'MG';
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {
      id: isMg ? 2 : 1,
      name: isMg ? 'Belo Horizonte' : 'Campinas',
      ibge_code: isMg ? '3106200' : '3509502',
      intermediate_region: isMg ? 'Belo Horizonte' : 'Campinas',
      immediate_region: '',
      immediate_region_code: '',
      intermediate_region_code: '',
      area_km2: 100,
      population: 1_000_000,
      population_density: 1_000,
      potential_category: 'ALTO',
      ch4_real_m3_year: isMg ? 0 : 2_000,
      ch4_real_rsu_m3_year: isMg ? 0 : 1_200,
      ch4_real_rpo_m3_year: isMg ? 0 : 300,
      ch4_real_sewage_m3_year: isMg ? 0 : 500,
    },
  } as MunicipalityFeature;
};

describe('municipality detail UX', () => {
  it('keeps hover content compact and points users to click details', () => {
    const { container } = render(
      <EnhancedTooltip
        municipality={municipality('SP')}
        position={{ x: 2000, y: 2000 }}
        visible
        metric="methane_m3"
        scenario="real"
      />,
    );

    expect(container).toHaveTextContent('Campinas');
    expect(container).toHaveTextContent('Clique para detalhes');
    expect(container).not.toHaveTextContent('População');
    expect(container).not.toHaveTextContent('Composição');
    expect(container.firstElementChild).toHaveStyle({ left: '748px', top: '644px' });
  });

  it('moves the three SP urban streams into the click-open detail panel', () => {
    render(
      <MunicipalityProfilePanel
        municipality={municipality('SP')}
        visible
        onClose={jest.fn()}
        metric="methane_m3"
        scenario="real"
      />,
    );

    expect(screen.getByRole('complementary', { name: /Detalhes do município de Campinas/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Resíduos Urbanos/ }));

    expect(screen.getByText('FORSU')).toBeInTheDocument();
    expect(screen.getByText('Poda urbana')).toBeInTheDocument();
    expect(screen.getByText('Lodo de ETE')).toBeInTheDocument();
    expect(screen.getByText(/Não representa massa coletada em t\/ano/)).toBeInTheDocument();
  });

  it('shows the explicit MG validation gap instead of population-derived values', () => {
    render(
      <MunicipalityProfilePanel
        municipality={municipality('MG')}
        visible
        onClose={jest.fn()}
        metric="methane_m3"
        scenario="real"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Resíduos Urbanos/ }));
    expect(screen.getByText('Sem inventário urbano validado para MG')).toBeInTheDocument();
    expect(screen.getByText(/não foram inferidos a partir da população/i)).toBeInTheDocument();
  });
});
