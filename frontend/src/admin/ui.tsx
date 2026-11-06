import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/** A filter chip: the picked one dark, the rest grey. */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-600 ${
        on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

/** A row of chips, scrolling sideways on a phone. */
export function Chips({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {children}
    </div>
  )
}

/** Asking first with something to type (founder's pick 7A, 2026-10-28):
 * a sheet from the bottom on a phone, a box in the middle on a laptop,
 * like the app's confirm. Esc or a tap outside closes it. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby={id}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-md sm:rounded-2xl sm:open:animate-zoom-in"
    >
      {open && (
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
          <h2 id={id} className="text-lg font-semibold break-words text-slate-900">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** The bar with Save while something isn't saved (founder's pick 15A,
 * 2026-11-06): docked across the bottom of the page, never floating over
 * the fields or the Bot's preview; on a phone right above the bottom bar,
 * and out of the way while the keyboard is open (Save is back once it
 * closes). `children`: its words and buttons. */
export function SaveBar({ children }: { children: ReactNode }) {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const view = window.visualViewport
    if (!view) return
    // A phone's keyboard takes a third of the screen or more.
    const check = () => setTyping(window.innerWidth < 1024 && view.height < window.innerHeight * 0.7)
    view.addEventListener('resize', check)
    return () => view.removeEventListener('resize', check)
  }, [])
  return (
    <>
      {/* Room at the end of the page, so the bar never hides its last row. */}
      <div aria-hidden className="h-20 lg:hidden" />
      <div
        role="region"
        aria-label="Save"
        className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 border-t border-slate-200 bg-surface px-4 py-2.5 lg:sticky lg:inset-x-auto lg:bottom-0 lg:-mx-6 lg:mt-6 lg:px-6 xl:-mx-8 xl:px-8 ${typing ? 'hidden' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </>
  )
}
