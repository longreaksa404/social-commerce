import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { showPage, takePage, turnPage } from './pageTurn.ts'

/** A category's products, turning like a page when another chip is
 * tapped (pageTurn.ts; the chip row names the same `turn`). `page`: which
 * category is shown. The outer box reaches the page's edges (`className`:
 * its margins and padding cancel the page's), so a turning page is cut
 * off there and not at the cards' own edges. */
export function TurningPage({
  turn,
  page,
  className,
  children,
}: {
  turn: string
  page: string
  className: string
  children: ReactNode
}) {
  const now = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (now.current) return showPage(turn, now.current)
  }, [turn])
  // Another category: this page (or the next page's, just opened) slides in.
  useLayoutEffect(() => {
    const kept = takePage(turn)
    if (kept && now.current) turnPage(now.current, kept.old, kept.from)
  }, [turn, page])
  return (
    <div className={`relative ${className}`}>
      <div ref={now}>{children}</div>
    </div>
  )
}
