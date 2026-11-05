import { useEffect, type RefObject } from 'react'

/** Shows every `[data-reveal]` inside `root` as it comes 15% into view, by
 * setting `data-revealed` (home.css: a fade and rise, or a wipe up for
 * `data-reveal="wipe"`). Once shown it stays. Without IntersectionObserver,
 * or with reduce motion (CSS), everything is simply there. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])') ?? []
    if (typeof IntersectionObserver === 'undefined') {
      for (const element of elements) element.setAttribute('data-revealed', '')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15 },
    )
    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [root])
}
