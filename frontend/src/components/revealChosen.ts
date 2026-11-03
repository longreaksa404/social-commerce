import { reducedMotion } from './effects.ts'

/** A row that scrolls sideways (the shop's category chips, the Orders
 * tabs): scrolls it so the chosen item shows with the one before it in
 * full, so the row reads as scrolled rather than cut off at the screen's
 * edge (UI check #12, founder 2026-10-17). Sideways only; the page doesn't
 * move. `chosen` is the row's item (its <li>), or anything inside it. */
export function revealChosen(row: HTMLElement | null, chosen: HTMLElement | null) {
  if (!row || !chosen) return
  const item = chosen.closest('li') ?? chosen
  const gutter = 16
  const rowLeft = row.getBoundingClientRect().left - row.scrollLeft
  const leftOf = (el: Element) => el.getBoundingClientRect().left - rowLeft
  const before = item.previousElementSibling
  let target = before ? leftOf(before) - gutter : 0
  const end = leftOf(item) + item.getBoundingClientRect().width + gutter
  if (end > target + row.clientWidth) target = end - row.clientWidth
  row.scrollLeft = Math.max(0, target)
}

/** The same kind of row, scrolled so the chosen item sits in its middle
 * (as far as the row's ends allow), gliding there when `glide`: the
 * seller's Products chips, like Taobao's (founder, 2026-11-03). Never
 * glides with the phone's reduce-motion setting on. */
export function centreChosen(row: HTMLElement | null, chosen: HTMLElement | null, glide: boolean) {
  if (!row || !chosen) return
  const item = chosen.closest('li') ?? chosen
  const box = row.getBoundingClientRect()
  const at = item.getBoundingClientRect()
  const left = row.scrollLeft + at.left - box.left + at.width / 2 - row.clientWidth / 2
  const still = !glide || reducedMotion()
  row.scrollTo({ left: Math.max(0, left), behavior: still ? 'instant' : 'smooth' })
}
