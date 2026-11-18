/**
 * The biomass-flow Sankey converts biogas to CH₄ with the platform's one
 * fraction (FIESP 2025, as the map and the backend use), not a private 60%.
 */
import { render, screen } from '@testing-library/react'
import BiomassFlowSankey from '../charts/BiomassFlowSankey'
import { CH4_FRACTION_OF_BIOGAS } from '@/data/scenarioFactors'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

describe('BiomassFlowSankey', () => {
  it('states and applies the CH₄ fraction the map uses', () => {
    expect(CH4_FRACTION_OF_BIOGAS).toBe(0.625)
    render(<BiomassFlowSankey theoreticalPotential={1_000_000} />)
    expect(screen.getByText('Baseado em 62,5% de CH₄ no biogás')).toBeInTheDocument()
  })
})
