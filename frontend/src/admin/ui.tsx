import type { ReactNode } from 'react'

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
