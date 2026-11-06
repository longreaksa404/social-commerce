import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Lang } from '../../i18n/core.ts'
import { canUse3D } from './can3d.ts'
import type { PhoneScene, Shot } from './phoneScene.ts'
import { PhoneStill } from './PhoneStill.tsx'
import { screenUrl, type Screen } from './screens.ts'

type State = 'off' | 'loading' | 'on'

/** The phone: always the still picture (PhoneStill), and on phones that can
 * (canUse3D) the 3D one over it, which fades in once drawn and hides the
 * picture. If the 3D one fails (too slow, the GPU lost) it goes and the
 * picture comes back. three.js (its own chunk) loads once `wait` is over
 * (the opening: building the scene stalls the page for a moment), the
 * phone is near the screen and the browser is idle. `follow`: lean toward
 * the pointer and push in on scroll (the first screen). */
export function Phone3D({
  screen,
  lang,
  shot,
  priority = false,
  follow = false,
  wait = false,
  className = '',
  style,
}: {
  screen: Screen
  lang: Lang
  shot: Shot
  priority?: boolean
  follow?: boolean
  wait?: boolean
  className?: string
  style?: CSSProperties
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<PhoneScene | null>(null)
  const [state, setState] = useState<State>(() => (canUse3D() ? 'loading' : 'off'))
  const [near, setNear] = useState(false)
  const url = screenUrl(lang, screen)
  // The latest screen, shot and visibility, for when the scene arrives.
  const latest = useRef({ url, shot, visible: false })

  useEffect(() => {
    latest.current.url = url
    scene.current?.setScreen(url)
  }, [url])

  useEffect(() => {
    latest.current.shot = shot
    if (!scene.current) return
    scene.current.setShot(shot)
    scene.current.sweep()
  }, [shot])

  // Make the scene once the opening is over and the phone is near.
  useEffect(() => {
    if (state !== 'loading' || wait || !near) return
    let cancelled = false
    // When the phone has nothing else to do (building the scene holds it
    // for a moment), at the latest after 1.5 s.
    const idle = 'requestIdleCallback' in window
    const start = (build: () => void) =>
      idle ? window.requestIdleCallback(build, { timeout: 1500 }) : window.setTimeout(build, 100)
    const timer = start(() => {
      import('./phoneScene.ts')
        .then(({ createPhoneScene }) => {
          if (cancelled || !canvas.current || scene.current) return
          scene.current = createPhoneScene(canvas.current, {
            screen: latest.current.url,
            shot: latest.current.shot,
            finish: 'titanium',
            onFirstFrame: () => setState('on'),
            onFail: () => {
              setState('off')
              const failed = scene.current
              scene.current = null
              failed?.dispose()
            },
          })
          scene.current.setRunning(latest.current.visible && !document.hidden)
        })
        .catch(() => setState('off'))
    })
    return () => {
      cancelled = true
      if (idle) window.cancelIdleCallback(timer)
      else window.clearTimeout(timer)
    }
  }, [state, wait, near])

  // The first screen's light crosses the 3D phone once it's there.
  useEffect(() => {
    if (state === 'on' && latest.current.shot === 'hero') scene.current?.sweep()
  }, [state])

  useEffect(() => () => scene.current?.dispose(), [])

  // Draw only while on screen (or about to be) and the tab is showing.
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const apply = () => scene.current?.setRunning(latest.current.visible && !document.hidden)
    const observer = new IntersectionObserver(
      ([entry]) => {
        latest.current.visible = entry.isIntersecting
        if (entry.isIntersecting) setNear(true)
        apply()
      },
      { rootMargin: '25% 0px' },
    )
    observer.observe(element)
    document.addEventListener('visibilitychange', apply)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', apply)
    }
  }, [state])

  useEffect(() => {
    if (!follow || state !== 'on') return
    const lean = (event: PointerEvent) =>
      scene.current?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
    const rest = () => scene.current?.setPointer(0, 0)
    const push = () => scene.current?.setScroll(window.scrollY / window.innerHeight)
    window.addEventListener('pointermove', lean, { passive: true })
    window.addEventListener('pointerup', rest)
    document.documentElement.addEventListener('pointerleave', rest)
    window.addEventListener('scroll', push, { passive: true })
    return () => {
      window.removeEventListener('pointermove', lean)
      window.removeEventListener('pointerup', rest)
      document.documentElement.removeEventListener('pointerleave', rest)
      window.removeEventListener('scroll', push)
    }
  }, [follow, state])

  // Short, so the picture and the 3D phone are seen together only briefly.
  const fade = 'transition-opacity duration-300 ease-out'
  return (
    <div className="relative">
      <div data-still className={`${fade} ${state === 'on' ? 'opacity-0' : 'opacity-100'}`}>
        <PhoneStill
          screen={screen}
          lang={lang}
          priority={priority}
          className={className}
          style={style}
          sweep={typeof shot === 'number' ? shot : undefined}
        />
      </div>
      {state !== 'off' && (
        <canvas
          ref={canvas}
          data-phone3d
          data-shot={String(shot)}
          data-screen={url}
          aria-hidden
          className={`pointer-events-none absolute top-[-15%] left-[-15%] h-[130%] w-[130%] ${fade} ${state === 'on' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}
