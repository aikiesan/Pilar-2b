import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { useDialog } from './useDialog'

function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(true, onClose)
  return (
    <div ref={ref} role="dialog" tabIndex={-1}>
      <button>First</button>
      <button>Last</button>
    </div>
  )
}

function Page() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <Dialog onClose={() => setOpen(false)} />}
    </>
  )
}

describe('useDialog', () => {
  it('moves focus in, keeps Tab inside, closes on Escape and gives focus back', () => {
    render(<Page />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')

    screen.getByRole('button', { name: 'Last' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })
})
