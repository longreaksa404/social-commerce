import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** A form's own footer plus one pinned copy while that footer is outside
 * the viewport. The copy uses the footer's laptop width and steps aside
 * for a phone keyboard (founder's picks 7A and 9A, 2026-11-07). */
export function FormSaveBar({ children, standalone = false }: { children: ReactNode; standalone?: boolean }) {
  const footer = useRef<HTMLDivElement>(null)
  const [footerVisible, setFooterVisible] = useState(true)
  const [typing, setTyping] = useState(false)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [frame, setFrame] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const element = footer.current
    if (!element) return
    const watch = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), {
      rootMargin: '0px 0px -88px 0px',
    })
    watch.observe(element)
    return () => watch.disconnect()
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const measure = () => {
      setWide(media.matches)
      const box = footer.current?.getBoundingClientRect()
      if (box) setFrame({ left: box.left, width: box.width })
    }
    measure()
    media.addEventListener('change', measure)
    window.addEventListener('resize', measure)
    const size = footer.current ? new ResizeObserver(measure) : null
    if (footer.current) size?.observe(footer.current)
    return () => {
      media.removeEventListener('change', measure)
      window.removeEventListener('resize', measure)
      size?.disconnect()
    }
  }, [])

  useEffect(() => {
    const view = window.visualViewport
    if (!view) return
    const check = () => setTyping(window.innerWidth < 1024 && view.height < window.innerHeight * 0.7)
    view.addEventListener('resize', check)
    return () => view.removeEventListener('resize', check)
  }, [])

  const showPinned = !footerVisible && !typing
  const content = <div className="flex items-center gap-3 px-4 py-3 sm:px-6">{children}</div>

  return (
    <>
      <div
        ref={footer}
        inert={showPinned}
        aria-hidden={showPinned}
        className={
          standalone
            ? '-mx-4 bg-surface shadow-card ring-1 ring-slate-900/6 sm:mx-0 sm:rounded-2xl'
            : 'border-t border-slate-200 bg-slate-50 sm:rounded-b-2xl'
        }
      >
        {content}
      </div>
      {createPortal(
        <div
          inert={!showPinned}
          aria-hidden={!showPinned}
          style={wide ? { left: frame.left, width: frame.width } : undefined}
          className={`fixed z-30 bg-surface/95 backdrop-blur transition-transform duration-300 ease-out motion-reduce:transition-none ${
            wide
              ? 'bottom-4 rounded-2xl shadow-card ring-1 ring-slate-900/6'
              : 'inset-x-0 bottom-0 border-t border-slate-200 pb-[env(safe-area-inset-bottom)]'
          } ${showPinned ? 'translate-y-0' : 'translate-y-[calc(100%+1.5rem)]'}`}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  )
}
