/**
 * PILAR-2b V3 Frontend - Home Page Tests
 * Tests for the main landing page component
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '../page'

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockedLink({ href, children, className }: any) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
})

describe('HomePage', () => {
  beforeEach(() => {
    render(<HomePage />)
  })

  describe('Header Navigation', () => {
    it('renders the PILAR-2b V3 logo and title', () => {
      const titles = screen.getAllByText('PILAR-2b V3')
      expect(titles).toHaveLength(2) // One in header, one in footer
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })

    it('renders all navigation links', () => {
      const navLinks = ['Início', 'Dashboard', 'Análises', 'Sobre']

      navLinks.forEach(linkText => {
        const links = screen.getAllByRole('link', { name: linkText })
        expect(links.length).toBeGreaterThan(0)
      })
    })

    it('renders the access platform button', () => {
      expect(screen.getByText('Acessar Plataforma')).toBeInTheDocument()
    })
  })

  describe('Hero Section', () => {
    it('renders the main hero title', () => {
      expect(screen.getByText(/Análise de Potencial de/)).toBeInTheDocument()
      expect(screen.getByText('Biogás')).toBeInTheDocument()
    })

    it('renders the hero description', () => {
      expect(screen.getByText(/Plataforma moderna para identificação e análise/)).toBeInTheDocument()
    })

    it('renders the interactive map button', () => {
      expect(screen.getByRole('button', { name: /Explorar Mapa Interativo/ })).toBeInTheDocument()
    })

    it('renders and handles demonstration button click', async () => {
      const user = userEvent.setup()
      const demoButton = screen.getByRole('button', { name: /Ver Demonstração/ })

      expect(demoButton).toBeInTheDocument()

      await user.click(demoButton)

      // Button should still be visible after click
      expect(demoButton).toBeInTheDocument()
    })

    it('renders key statistics correctly', () => {
      expect(screen.getByText('645')).toBeInTheDocument()
      expect(screen.getByText('Municípios SP')).toBeInTheDocument()

      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Módulos Análise')).toBeInTheDocument()

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Open Source')).toBeInTheDocument()
    })
  })

  describe('Features Section', () => {
    it('renders the features section title', () => {
      expect(screen.getByText('Recursos Avançados da Plataforma')).toBeInTheDocument()
    })

    it('renders all feature cards', () => {
      const features = [
        'Mapeamento Interativo',
        'Análise MCDA',
        'Colaborativo'
      ]

      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument()
      })
    })

    it('renders feature descriptions', () => {
      expect(screen.getByText(/Visualização avançada de dados geoespaciais/)).toBeInTheDocument()
      expect(screen.getByText(/Algoritmos de análise multicritério/)).toBeInTheDocument()
      expect(screen.getByText(/Sistema de usuários com diferentes perfis/)).toBeInTheDocument()
    })
  })

  describe('Call-to-Action Section', () => {
    it('renders CTA section title', () => {
      expect(screen.getByText('Pronto para Começar?')).toBeInTheDocument()
    })

    it('renders CTA description', () => {
      expect(screen.getByText(/Explore o potencial de biogás em São Paulo/)).toBeInTheDocument()
    })

    it('renders CTA buttons', () => {
      expect(screen.getByRole('link', { name: /Acessar Dashboard/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Saiba Mais/ })).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('renders footer with logo and description', () => {
      expect(screen.getByText(/Plataforma moderna para análise de potencial de biogás/)).toBeInTheDocument()
    })

    it('renders all footer navigation sections', () => {
      const footerSections = ['Plataforma', 'Recursos', 'Projeto']

      footerSections.forEach(section => {
        expect(screen.getByText(section)).toBeInTheDocument()
      })
    })

    it('renders footer links', () => {
      const footerLinks = [
        'Dashboard', 'Análises', 'Documentação',
        'API', 'Suporte', 'Changelog',
        'Sobre', 'Equipe', 'Contato'
      ]

      footerLinks.forEach(linkText => {
        const links = screen.getAllByText(linkText)
        expect(links.length).toBeGreaterThan(0)
      })
    })

    it('renders copyright notice', () => {
      expect(screen.getByText(/© 2025 PILAR-2b V3/)).toBeInTheDocument()
    })
  })

  describe('Interactive Elements', () => {
    it('handles demonstration video button state change', async () => {
      const user = userEvent.setup()
      const playButton = screen.getByRole('button', { name: /Ver Demonstração/ })

      // Initial state
      expect(playButton).toBeInTheDocument()

      // Click to play
      await user.click(playButton)

      // Button should still be present (state managed internally)
      expect(playButton).toBeInTheDocument()
    })

    it('renders all icons correctly', () => {
      // Test that Lucide icons are rendered (they should be in the DOM)
      const iconElements = document.querySelectorAll('svg')
      expect(iconElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design Elements', () => {
    it('applies correct CSS classes for responsive design', () => {
      const heroSection = screen.getByText(/Análise de Potencial de/).closest('section')
      expect(heroSection).toHaveClass('py-20')

      const gridContainer = screen.getByText('Mapeamento Interativo').closest('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    })

    it('renders mobile-friendly navigation', () => {
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('hidden', 'md:flex')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements.length).toBeGreaterThan(0)

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
    })

    it('has accessible buttons with proper roles', () => {
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })

    it('has accessible links with proper roles', () => {
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href')
      })
    })
  })

  describe('Content Validation', () => {
    it('displays correct municipality count for São Paulo', () => {
      expect(screen.getByText('645')).toBeInTheDocument()
      expect(screen.getByText('Municípios SP')).toBeInTheDocument()
    })

    it('displays correct analysis modules count', () => {
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Módulos Análise')).toBeInTheDocument()
    })

    it('emphasizes open source nature', () => {
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Open Source')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('renders without crashing', () => {
      const titles = screen.getAllByText('PILAR-2b V3')
      expect(titles.length).toBeGreaterThan(0)
    })

    it('handles missing props gracefully', () => {
      // Component should render without any required props
      const { unmount } = render(<HomePage />)
      const titles = screen.getAllByText('PILAR-2b V3')
      expect(titles.length).toBeGreaterThan(0)
      unmount()
    })
  })
})