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
  kept.set(turn, { old: el.cloneNode(true) as HTMLElement, from, at: performance.now() })
}

/** The copy kept for this page, if a chip was tapped just now. */
export function takePage(turn: string) {
  const page = kept.get(turn)
  kept.delete(turn)
  return page && performance.now() - page.at < 1000 ? page : null
}

/** Slides `old` (the copy) out of `now`'s place and `now` in, as one
 * strip a page's width and a gap apart. `now`'s parent clips them
 * sideways while it turns, so the page never scrolls sideways. */
export function turnPage(now: HTMLElement, old: HTMLElement, from: 1 | -1) {
  const frame = now.parentElement
  if (!frame) return
  // A tap while a page is still turning: that one ends where it is.
  for (const a of now.getAnimations()) a.cancel()
  for (const el of frame.querySelectorAll(':scope > [data-leaving]')) el.remove()
  // The new products don't also rise in (the shop's first-time rise);
  // what never ends (a loading shimmer) can't be finished, and stays.
  for (const a of now.getAnimations({ subtree: true })) {
    if (a.effect?.getComputedTiming().endTime !== Infinity) a.finish()
  }

  old.dataset.leaving = '' // index.css: no animations of its own
  old.inert = true
  old.setAttribute('aria-hidden', 'true')
  Object.assign(old.style, {
    position: 'absolute',
    top: `${now.offsetTop}px`,
    left: `${now.offsetLeft}px`,
    width: `${now.offsetWidth}px`,
    pointerEvents: 'none',
  })
  frame.append(old)
  frame.style.overflowX = 'clip'

  const timing = { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  // 32px apart: the photo grid reaches 8px past its column on phones,
  // so the two pages' cards keep 16px between them.
  const away = (side: number) => `calc(${side * 100}% + ${side * 32}px) 0`
  const going = old.animate({ translate: ['0 0', away(-from)] }, timing)
  const coming = now.animate({ translate: [away(from), '0 0'] }, timing)
  // One start for both, so they move edge to edge: left to themselves,
  // the copy (just added) starts a frame later and they overlap.
  going.startTime = coming.startTime = document.timeline.currentTime
  const done = () => {
    old.remove()
    // Unclipped again, unless another tap started a new turn.
    if (!now.getAnimations().length) frame.style.overflowX = ''
  }
  coming.onfinish = done
  coming.oncancel = done
}
