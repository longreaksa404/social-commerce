import { useEffect, type RefObject } from 'react'

/** Shows every `[data-reveal]` inside `root` as it comes into view, by
 * setting `data-revealed` (home.css: a fade and rise, or for titles,
 * `data-reveal="wipe"`, a wipe up). Once shown it stays. Without
 * IntersectionObserver, or with reduce motion (CSS), everything is simply
 * there.
 *
 * A title starts fully clipped, and Chrome never reports a fully clipped
 * element as in view (2026-11-06: four titles stayed hidden on Android). So
 * for a title the page watches the block around it, which starts at or
 * above it, and wipes the title in once that block's top is 10% up the
 * screen. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])') ?? []
    const show = (element: Element) => element.setAttribute('data-revealed', '')
    if (typeof IntersectionObserver === 'undefined') {
      for (const element of elements) show(element)
      return
    }
    const fades = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          show(entry.target)
          fades.unobserve(entry.target)
        }
      },
      { threshold: 0.15 },
    )
    // The block watched → the titles it shows.
    const titlesOf = new Map<Element, HTMLElement[]>()
    const wipes = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          for (const title of titlesOf.get(entry.target) ?? []) show(title)
          wipes.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    for (const element of elements) {
      if (element.dataset.reveal !== 'wipe') {
        fades.observe(element)
        continue
      }
      const block = element.parentElement ?? element
      titlesOf.set(block, [...(titlesOf.get(block) ?? []), element])
      wipes.observe(block)
    }
    return () => {
      fades.disconnect()
      wipes.disconnect()
    }
  }, [root])
}
