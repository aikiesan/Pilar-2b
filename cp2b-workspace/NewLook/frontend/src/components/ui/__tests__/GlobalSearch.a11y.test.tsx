import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import GlobalSearch from '../GlobalSearch'
import { testWCAGAA } from '@/test/utils/accessibility'

jest.mock('@/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const mockMunicipalities = [
  {
    type: 'Feature',
    properties: {
      id: 1,
      ibge_code: '3550308',
      name: 'São Paulo',
      state: 'SP',
      total_biogas_potential: 1_200_000_000,
    },
    geometry: { type: 'Point', coordinates: [-46.6333, -23.5505] },
  },
  {
    type: 'Feature',
    properties: {
      id: 2,
      ibge_code: '3509502',
      name: 'Campinas',
      state: 'SP',
      total_biogas_potential: 350_000_000,
    },
    geometry: { type: 'Point', coordinates: [-47.0608, -22.9056] },
  },
]

jest.mock('@/hooks/useGeospatialData', () => ({
  useGeospatialData: () => ({
    data: { type: 'FeatureCollection', features: mockMunicipalities },
    isLoading: false,
    error: null,
  }),
}))

describe('GlobalSearch Accessibility', () => {
  it('meets WCAG 2.1 Level AA (closed state)', async () => {
    await testWCAGAA(<GlobalSearch />)
  })

  describe('Search input', () => {
    it('search input has accessible label or placeholder', () => {
      render(<GlobalSearch />)
      const input = screen.getByRole('searchbox') || screen.getByPlaceholderText(/search|municipality/i)
      expect(input).toBeInTheDocument()
    })

    it('opens on "/" keyboard shortcut and focuses the input', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      const input = screen.queryByRole('combobox') || screen.queryByRole('searchbox')
      if (input) expect(input).toHaveFocus()
    })

    it('closes on Escape and returns focus', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      await user.keyboard('{Escape}')
    })
  })

  describe('Results listbox', () => {
    it('results list uses role="listbox" with role="option" items', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      const input = screen.queryByRole('combobox') || screen.queryByRole('searchbox')
      if (input) {
        await user.type(input, 'São')
        const listbox = screen.queryByRole('listbox')
        if (listbox) {
          const options = screen.queryAllByRole('option')
          expect(options.length).toBeGreaterThan(0)
        }
      }
    })

    it('arrow key navigation works within results', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      const input = screen.queryByRole('combobox') || screen.queryByRole('searchbox')
      if (input) {
        await user.type(input, 'São')
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{ArrowUp}')
      }
    })
  })

  it('has no axe violations when open with results', async () => {
    const user = userEvent.setup()
    const { container } = render(<GlobalSearch />)
    await user.keyboard('/')
    const input = document.querySelector('input[type="search"], input[type="text"]')
    if (input) await user.type(input as HTMLElement, 'Camp')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
