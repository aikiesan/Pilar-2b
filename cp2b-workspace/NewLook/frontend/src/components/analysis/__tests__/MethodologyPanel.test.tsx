/**
 * The methodology panel is a real dialog (named, Escape closes it) and writes
 * the FDE formula with the page's decimal mark.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import MethodologyPanel from '../MethodologyPanel'
import { DEFAULT_FACTORS } from '@/types/analysis'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

describe('MethodologyPanel', () => {
  it('is a dialog named by its title, and Escape closes it', () => {
    const onClose = jest.fn()
    render(<MethodologyPanel factors={DEFAULT_FACTORS} isOpen onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'Metodologia FDE' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('writes the formula and the FDE with the pt-BR decimal mark', () => {
    render(<MethodologyPanel factors={DEFAULT_FACTORS} isOpen onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('0,90 × 0,80 × 0,88 × 0,84 = 0,532')
    expect(dialog).toHaveTextContent('53,2%')
  })
})
