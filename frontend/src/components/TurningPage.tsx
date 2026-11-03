import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { showPage, takePage, turnPage } from './pageTurn.ts'

/** A category's products (or a tab's orders), turning like a page when
 * another chip or tab is tapped (pageTurn.ts; the row names the same
 * `turn`). `page`: which one is shown. `ready` false: what shows is still
 * the last one's, kept while the new one loads (the Orders tabs), so it
 * turns once that's here. The outer box reaches the page's edges
 * (`className`: its margins and padding cancel the page's), so a turning
 * page is cut off there and not at the cards' own edges. */
export function TurningPage({
  turn,
  page,
  ready = true,
  className,
  children,
}: {
  turn: string
  page: string
  ready?: boolean
  className: string
  children: ReactNode
}) {
  const now = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (now.current) return showPage(turn, now.current)
  }, [turn])
  // Another one: this page (or the next page's, just opened) slides in.
  useLayoutEffect(() => {
    if (!ready) return
    const kept = takePage(turn)
    if (kept && now.current) turnPage(now.current, kept.old, kept.from)
  }, [turn, page, ready])
  return (
    <div className={`relative ${className}`}>
      {/* relative: the copy turning out rides beside the products. */}
      <div ref={now} className="relative">
        {children}
      </div>
    </div>
  )
}
