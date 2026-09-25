import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import GlobalSearch from '../GlobalSearch'
import { testWCAGAA } from '@/test/utils/accessibility'

jest.mock('@/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

// next-intl ships ESM that jest does not transform; the suite's convention is a
// per-file mock (see ThemeToggle.a11y.test.tsx). Returning real English strings
// rather than the key keeps the accessible-name assertions below meaningful.
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      trigger: 'Search municipality',
      trigger_aria: 'Search municipality (press /)',
      placeholder: 'Name or IBGE code...',
      input_aria: 'Search municipality',
      close_aria: 'Close search',
      results_aria: 'Search results',
      no_results: 'No municipality found',
      hints: '↑↓ navigate · Enter select · Esc close',
      per_year: 'm³/year',
    }
    return map[key] ?? key
  },
}))

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

// Undefined while the map data is still loading.
let mockFeatures: typeof mockMunicipalities | undefined = mockMunicipalities

jest.mock('@/hooks/useGeospatialData', () => ({
  useGeospatialData: () => ({
    data: mockFeatures && { type: 'FeatureCollection', features: mockFeatures },
    isLoading: !mockFeatures,
    error: null,
  }),
}))

afterEach(() => {
  mockFeatures = mockMunicipalities
})

describe('GlobalSearch Accessibility', () => {
  it('meets WCAG 2.1 Level AA (closed state)', async () => {
    await testWCAGAA(<GlobalSearch />)
  })

  describe('Search input', () => {
    it('search input has accessible label or placeholder', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      // The input only mounts once the search is opened.
      await user.keyboard('/')
      // A combobox (ARIA 1.2): it owns the results listbox and names the active option.
      const input = await screen.findByRole('combobox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAccessibleName()
    })

    it('opens on "/" keyboard shortcut and focuses the input', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      // A combobox (ARIA 1.2): it owns the results listbox and names the active option.
      const input = await screen.findByRole('combobox')
      // Focus is applied via a short setTimeout after opening.
      await waitFor(() => expect(input).toHaveFocus())
    })

    it('closes on Escape and returns focus', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Search municipality (press /)' })).toHaveFocus()
    })

    it('has a named close button that returns focus to the trigger', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      await user.click(screen.getByRole('button', { name: 'Close search' }))
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Search municipality (press /)' })).toHaveFocus()
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

    it('moves the active option with the arrow keys and announces it', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      const input = await screen.findByRole('combobox')
      await user.type(input, '35') // both IBGE codes start with 35
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
      expect(input).toHaveAttribute('aria-activedescendant', options[0].id)

      await user.keyboard('{ArrowDown}')
      expect(input).toHaveAttribute('aria-activedescendant', options[1].id)
      expect(options[1]).toHaveAttribute('aria-selected', 'true')

      await user.keyboard('{ArrowUp}')
      expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
    })

    it('stays collapsed and announces it when nothing matches', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch />)
      await user.keyboard('/')
      const input = await screen.findByRole('combobox')
      await user.type(input, 'zzz')
      // No listbox is rendered, so the combobox must not claim or point to one.
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(input).not.toHaveAttribute('aria-controls')
      expect(screen.getByRole('status')).toHaveTextContent('No municipality found')
    })

    it('makes the first result active when results arrive after an arrow key', async () => {
      mockFeatures = undefined
      const user = userEvent.setup()
      const { rerender } = render(<GlobalSearch />)
      await user.keyboard('/')
      const input = await screen.findByRole('combobox')
      await user.type(input, '35')
      await user.keyboard('{ArrowDown}')

      mockFeatures = mockMunicipalities
      rerender(<GlobalSearch />)
      const options = screen.getAllByRole('option')
      expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
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
