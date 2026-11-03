import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { reducedMotion } from './effects.ts'

/** Where a row's chosen item sits in the box the marker is placed in:
 * from the box's left and top edges, its size, and how far its right and
 * bottom edges are from the box's. */
export type Spot = { left: number; top: number; width: number; height: number; right: number; bottom: number }

/** The marker's style for a spot, e.g. `{ clipPath: 'inset(…)' }`. */
export type Place = (spot: Spot) => Partial<Record<'clipPath' | 'translate' | 'width', string>>

// Where a row stood as a chip was tapped, for the row that replaces it
// (the shop's All and its categories are separate pages), by row.
const carried = new Map<string, { scroll: number; spot: Spot; at: number }>()

/** A row of chips or tabs that scrolls sideways (founder, 2026-11-03/04):
 * the chosen item (the one marked `data-chosen`, inside `box`) glides to
 * the middle of `row` when another is chosen, like Taobao's, and is
 * there at once when the page opens; `marker` (the navy behind the
 * chosen chip, the line under the chosen tab) slides to it, and keeps to
 * it as the items change size (counts, the language, the fonts, a
 * laptop's window wrapping them). Instant with the reduce-motion setting
 * (and the marker's transition, by index.css). `items` names the items,
 * to watch the new ones. `carry`: the row is replaced by another when a
 * chip is tapped (carryRow), which starts where this one stood. */
export function useChosenMarker({
  chosen,
  row,
  box,
  marker,
  place,
  items,
  carry,
}: {
  chosen: string | null
  row: RefObject<HTMLElement | null>
  box: RefObject<HTMLElement | null>
  marker: RefObject<HTMLElement | null>
  place: Place
  items: string
  carry?: string
}) {
  // The row as last placed: its box, the item chosen in it (null: none),
  // and what watches its items' sizes. A new box (the row shown again,
  // say after the Orders tabs' loading line) starts afresh.
  const last = useRef<{ box: HTMLElement; chosen: string | null; items: string; watch: ResizeObserver } | null>(null)

  // After every render: the items' widths may have changed with it.
  useLayoutEffect(() => {
    const r = row.current
    const b = box.current
    const m = marker.current
    if (!r || !b || !m) return
    const same = last.current?.box === b
    const before = same ? last.current!.chosen : null
    const item = b.querySelector<HTMLElement>('[data-chosen]')
    const changed = !same || before !== chosen
    let glide = changed && before !== null
    if (changed && before === null && carry) {
      const from = carried.get(carry)
      carried.delete(carry)
      if (from && performance.now() - from.at < 1000) {
        r.scrollTo({ left: from.scroll, behavior: 'instant' })
        mark(m, from.spot, false, place)
        m.getBoundingClientRect() // so the slide starts from there
        glide = true
      }
    }
    mark(m, spotOf(b, item), glide, place)
    if (changed) centre(r, item, glide)

    // The items' sizes (the fonts, a laptop's window wrapping them),
    // watched again for a new row or new items.
    let watch = last.current?.watch
    if (!same || last.current!.items !== items || !watch) {
      watch?.disconnect()
      watch = new ResizeObserver(() => mark(m, spotOf(b, b.querySelector('[data-chosen]')), false, place))
      for (const el of [b, ...b.querySelectorAll('li')]) if (el !== m) watch.observe(el)
    }
    last.current = { box: b, chosen, items, watch }
  })
  useEffect(() => () => last.current?.watch.disconnect(), [])
}

/** Keeps where `row` stands as one of its chips is tapped, for the row
 * that replaces it (useChosenMarker's `carry`). Nothing for the chip
 * already chosen: the row stays. */
export function carryRow(carry: string, row: HTMLElement | null, box: HTMLElement | null, tapped: HTMLElement) {
  const item = box?.querySelector<HTMLElement>('[data-chosen]')
  if (!row || !box || !item || item === tapped) return
  const spot = spotOf(box, item)
  if (spot) carried.set(carry, { scroll: row.scrollLeft, spot, at: performance.now() })
}

function spotOf(box: HTMLElement, item: HTMLElement | null): Spot | null {
  if (!item) return null
  const b = box.getBoundingClientRect()
  const a = item.getBoundingClientRect()
  return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height, right: b.right - a.right, bottom: b.bottom - a.bottom }
}

/** Puts the marker on the spot (none: hides it), sliding there or not.
 * Left alone when it's already there, so a slide that's playing isn't
 * cut short. */
function mark(marker: HTMLElement, spot: Spot | null, slide: boolean, place: Place) {
  marker.hidden = !spot
  if (!spot) return
  const style = place(spot)
  const at = JSON.stringify(style)
  if (marker.dataset.at === at) return
  marker.dataset.at = at
  marker.style.transitionDuration = slide ? '' : '0s'
  Object.assign(marker.style, style)
}

/** Scrolls the row so the item sits in its middle (as far as the row's
 * ends allow), gliding there or not. */
function centre(row: HTMLElement, item: HTMLElement | null, glide: boolean) {
  if (!item) return
  const box = row.getBoundingClientRect()
  const at = item.getBoundingClientRect()
  const left = row.scrollLeft + at.left - box.left + at.width / 2 - row.clientWidth / 2
  row.scrollTo({ left: Math.max(0, left), behavior: glide && !reducedMotion() ? 'smooth' : 'instant' })
}
