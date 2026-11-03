import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { carryRow, useChosenMarker, type Place } from './chosenMarker.ts'
import { keepPage } from './pageTurn.ts'

export type ChipItem = {
  id: string
  label: ReactNode
  count?: number
  /** A link (the shop's categories), or else a button calling onChoose. */
  to?: string
  onChoose?: () => void
}

/** A white chip, as every chip in a ChipRow (and anything ending one). */
export const chipClass =
  'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-surface px-4 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100'

const SHAPE = 'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap'

/** One row of chips, one of them chosen (the seller's Products, the
 * shop's categories). It scrolls sideways; with `wrap`, laptops wrap it
 * instead. Tapping a chip glides the row until it's in the middle and
 * the navy slides over to it (useChosenMarker; founder, 2026-11-03/04).
 *
 * The navy is a copy of the chips, all navy with white words (and navy
 * between them), seen through a pill-shaped window over the chosen one:
 * as the window slides, a chip it passes shows white on navy too, never
 * dark words on navy. It sets off at the tap, by transform, so it glides
 * even while the page changes under it. `end`: <li>s after the chips (Products' "Edit
 * categories"); the copy leaves them out, as they change no chip's
 * place. `carry`: see useChosenMarker. */
export function ChipRow({
  label,
  chips,
  chosen,
  navigation = false,
  wrap = false,
  end,
  carry,
  turn,
  className = '',
}: {
  label: string
  chips: ChipItem[]
  chosen: string | null
  /** Links: a navigation landmark, not a group of buttons. */
  navigation?: boolean
  wrap?: boolean
  end?: ReactNode
  carry?: string
  /** The TurningPage of this row's products, which turns when a chip is tapped. */
  turn?: string
  className?: string
}) {
  const row = useRef<HTMLDivElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const navy = useRef<HTMLDivElement>(null)
  const follow = useChosenMarker({ chosen, row, box: band, marker: navy, place: windowOver, items: chips.map((c) => c.id).join(), carry })

  // A tap on another chip: the row (carry) and the products (turn) keep
  // where they stood, for the motion to start there, and the navy sets off
  // for the chip at once.
  const keep = (id: string, tapped: HTMLElement) => {
    if (id === chosen) return
    if (carry) carryRow(carry, row.current, band.current, tapped)
    if (turn) {
      const place = (key: string | null) => chips.findIndex((c) => c.id === key)
      keepPage(turn, place(id) > place(chosen) ? 1 : -1)
    }
    follow(tapped)
  }
  const words = (chip: ChipItem, count: string) => (
    <>
      {chip.label}
      {chip.count !== undefined && <span className={`font-normal tabular-nums ${count}`}>{chip.count}</span>}
    </>
  )
  return (
    <div
      ref={row}
      role={navigation ? 'navigation' : 'group'}
      aria-label={label}
      className={`overflow-x-auto [scrollbar-width:none] ${className}`}
    >
      <div ref={band} className={`relative w-max ${wrap ? 'lg:w-auto' : ''}`}>
        <ul className={`flex gap-2 px-4 ${wrap ? 'lg:flex-wrap lg:px-0' : ''}`}>
          {chips.map((chip) => {
            const on = chip.id === chosen
            return (
              <li key={chip.id}>
                {chip.to ? (
                  <Link
                    to={chip.to}
                    aria-current={on ? 'page' : undefined}
                    data-chosen={on || undefined}
                    onClick={(e) => keep(chip.id, e.currentTarget)}
                    className={chipClass}
                  >
                    {words(chip, 'text-slate-500')}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-pressed={on}
                    data-chosen={on || undefined}
                    onClick={(e) => {
                      keep(chip.id, e.currentTarget)
                      chip.onChoose?.()
                    }}
                    className={chipClass}
                  >
                    {words(chip, 'text-slate-500')}
                  </button>
                )}
              </li>
            )
          })}
          {end}
        </ul>
        {/* The window: a pill the chosen chip's size, moved over it
            (--x, --y), cutting off what's outside it. Inside it, the navy
            copy, laid out exactly as the chips above (the same row, gaps
            and wrapping, the band's width --bw), moved back as far, so it
            stays on the chips while the window slides. Both move by
            transform, together (the copy takes the window's timing). */}
        <div
          ref={navy}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 overflow-hidden rounded-full [transform:translate(var(--x),var(--y))] transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          <div
            className={`absolute top-0 left-0 flex gap-2 bg-accent px-4 [width:var(--bw)] [transform:translate(calc(var(--x)*-1),calc(var(--y)*-1))] [transition-property:transform] [transition-duration:inherit] [transition-timing-function:inherit] [transition-delay:inherit] ${
              wrap ? 'lg:flex-wrap lg:px-0' : ''
            }`}
          >
            {chips.map((chip) => (
              <span key={chip.id} className={`${SHAPE} border-accent bg-accent text-on-accent`}>
                {words(chip, 'opacity-75')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The window: a pill the chosen chip's size, over it. */
const windowOver: Place = (spot) => ({
  '--x': `${spot.left}px`,
  '--y': `${spot.top}px`,
  width: `${spot.width}px`,
  height: `${spot.height}px`,
  '--bw': `${spot.left + spot.width + spot.right}px`,
})
