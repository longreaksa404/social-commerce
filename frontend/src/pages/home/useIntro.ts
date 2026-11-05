import { useEffect, useState } from 'react'
import { reducedMotion } from '../../components/effects.ts'

export type Intro = 'playing' | 'done'

const KEY = 'sc.home.intro'
const LENGTH_MS = 1600
const ENDS_IT = ['pointerdown', 'wheel', 'touchmove', 'keydown'] as const

function seen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** The start page's opening, like a film's title (spec 2026-11-04 §4.1):
 * once per visit (this tab), never with reduce motion. A tap, a key or a
 * scroll ends it at once. It only animates what's already on the page, so
 * nothing waits for it. */
export function useIntro(): Intro {
  const [intro, setIntro] = useState<Intro>(() => (reducedMotion() || seen() ? 'done' : 'playing'))

  useEffect(() => {
    if (intro === 'done') return
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // Storage blocked: it plays again next visit, nothing else changes.
    }
    const end = () => setIntro('done')
    const onScroll = () => {
      if (window.scrollY > 0) end()
    }
    const timer = window.setTimeout(end, LENGTH_MS)
    for (const name of ENDS_IT) window.addEventListener(name, end, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const name of ENDS_IT) window.removeEventListener(name, end)
      window.removeEventListener('scroll', onScroll)
    }
  }, [intro])

  return intro
}
