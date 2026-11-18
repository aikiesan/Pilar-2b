import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import MapPreviewCard from '../MapPreviewCard'
import { RAMP_DEFAULT } from '@/lib/mapMetrics'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ unoptimized, ...props }: { unoptimized?: boolean; alt: string }) => <img {...props} />,
}))

describe('MapPreviewCard', () => {
  it('is one link to the map, named by its visible call to action', () => {
    render(<MapPreviewCard />)
    const link = screen.getByRole('link', { name: 'Explorar o mapa' })
    expect(link).toHaveAttribute('href', '/map')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('describes the picture through the caption and the alt', () => {
    render(<MapPreviewCard />)
    const link = screen.getByRole('link', { name: 'Explorar o mapa' })
    expect(link).toHaveAccessibleDescription(/biomassa residual por município/)
    expect(link).toHaveAccessibleDescription(/Prévia do mapa: os municípios do estado de São Paulo/)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/map-preview-sp.svg')
  })

  it("draws its legend in the map's default ramp", () => {
    const { container } = render(<MapPreviewCard />)
    const swatches = [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"] [style]')]
    expect(swatches.map((s) => s.style.backgroundColor)).toHaveLength(RAMP_DEFAULT.length)
  })

  it('has no axe violations', async () => {
    const { container } = render(<MapPreviewCard />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
