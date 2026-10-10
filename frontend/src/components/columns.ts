import { useSyncExternalStore } from 'react'

// A photo wall's columns at each width (the shop's grid and the seller's):
// 2 on phones, then 3, 4 and 5 from Tailwind's sm, lg and xl.
const WIDER = [
  [5, window.matchMedia('(min-width: 80rem)')],
  [4, window.matchMedia('(min-width: 64rem)')],
  [3, window.matchMedia('(min-width: 40rem)')],
] as const
const columnCount = () => WIDER.find(([, query]) => query.matches)?.[0] ?? 2
const onWidthChange = (notify: () => void) => {
  for (const [, query] of WIDER) query.addEventListener('change', notify)
  return () => WIDER.forEach(([, query]) => query.removeEventListener('change', notify))
}

/** How many columns a photo wall has at the screen's width; follows the
 * phone turning or the window being resized. */
export const useColumnCount = () => useSyncExternalStore(onWidthChange, columnCount)

/** `items` dealt into `count` columns like cards: the 1st to the left,
 * the 2nd beside it, and so on, so they read left to right, then down
 * (item `row * count + column`). Side-by-side columns, not CSS columns:
 * iPhone Safari draws a card that fades in or shrinks (tapped) in a CSS
 * column other than the first late, or not at all, for a moment. */
export function deal<T>(items: T[], count: number): T[][] {
  const columns = Array.from({ length: count }, (): T[] => [])
  items.forEach((item, i) => columns[i % count].push(item))
  return columns
}
