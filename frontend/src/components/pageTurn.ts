import { reducedMotion } from './effects.ts'

/* Changing category turns the page (founder, 2026-11-04): the products
   shown slide out and the new category's slide in from the side of the
   chip tapped, together and a gap apart. The chip row keeps a copy of
   the products as a chip is tapped (keepPage); the TurningPage showing
   the products, the same one or the next page's (the shop's All and its
   categories are separate pages), slides it out as the new ones come in
   (takePage, turnPage). */

// The TurningPage element showing each kind of page's products, by name.
const shown = new Map<string, HTMLElement>()
// A copy of the products as a chip was tapped, by name.
const kept = new Map<string, { old: HTMLElement; from: 1 | -1; at: number }>()

export function showPage(turn: string, el: HTMLElement) {
  shown.set(turn, el)
  return () => {
    if (shown.get(turn) === el) shown.delete(turn)
  }
}

/** A chip was tapped: keeps a copy of the products shown, to slide out
 * towards `from`'s other side (1: the chip is further along the row, so
 * the new products come from the right). */
export function keepPage(turn: string, from: 1 | -1) {
  const el = shown.get(turn)
  if (!el || reducedMotion()) return
  const old = el.cloneNode(true) as HTMLElement
  // A page still turning out: not part of what's shown now.
  for (const leaving of old.querySelectorAll('[data-leaving]')) leaving.remove()
  kept.set(turn, { old, from, at: performance.now() })
}

/** The copy kept for this page, if a chip was tapped just now (within 3
 * s: an Orders tab's orders may take a moment to come; later than that,
 * they just show). */
export function takePage(turn: string) {
  const page = kept.get(turn)
  kept.delete(turn)
  return page && performance.now() - page.at < 3000 ? page : null
}

/** Slides `old` (the copy) out of `now`'s place and `now` in, as one
 * strip: the copy rides inside `now`, a page's width and a gap to the
 * side, so a single animation moves both and the browser starts it on
 * the first frame it draws (nothing skipped while the page is busy).
 * `now`'s parent clips them sideways while it turns, so the page never
 * scrolls sideways. */
export function turnPage(now: HTMLElement, old: HTMLElement, from: 1 | -1) {
  const frame = now.parentElement
  if (!frame) return
  // A tap while a page is still turning: that one ends where it is.
  for (const a of now.getAnimations()) a.cancel()
  for (const el of now.querySelectorAll(':scope > [data-leaving]')) el.remove()
  // The new products don't also rise in (the shop's first-time rise);
  // what never ends (a loading shimmer) can't be finished, and stays.
  for (const a of now.getAnimations({ subtree: true })) {
    if (a.effect?.getComputedTiming().endTime !== Infinity) a.finish()
  }

  // Apart by what the content reaches past its column (phones: the photo
  // grid 8px, a list's card out to the screen's edges, 16px) on both
  // sides, plus 16px, so the two pages' cards keep 16px between them.
  const box = now.getBoundingClientRect()
  let reach = 0
  for (const el of now.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *')) {
    const r = el.getBoundingClientRect()
    // Not shown here (the phones' list on a laptop): no box at all.
    if (r.width) reach = Math.max(reach, box.left - r.left, r.right - box.right)
  }
  const gap = 2 * Math.round(reach) + 16
  const side = (to: number) => `calc(${to * 100}% + ${to * gap}px)`

  old.dataset.leaving = '' // index.css: no animations of its own
  old.inert = true
  old.setAttribute('aria-hidden', 'true')
  Object.assign(old.style, { position: 'absolute', top: '0', left: side(-from), width: '100%', pointerEvents: 'none' })
  now.append(old)
  frame.style.overflowX = 'clip'

  const coming = now.animate(
    { translate: [`${side(from)} 0`, '0 0'] },
    { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  )
  const done = () => {
    old.remove()
    // Unclipped again, unless another tap started a new turn.
    if (!now.getAnimations().length) frame.style.overflowX = ''
  }
  coming.onfinish = done
  coming.oncancel = done
}
