import { useState, type CSSProperties } from 'react'
import type { Lang } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { screenUrl, type Screen } from './screens.ts'

/** A phone drawn in CSS (a titanium edge, a black bezel, the island) around
 * one of the app's screens. It's the whole phone where 3D can't run, and
 * what shows while the 3D one loads. A new screen fades in over the old one
 * once it has loaded, so the phone is never blank. */
export function PhoneStill({
  screen,
  lang,
  priority = false,
  className = '',
  style,
  sweep,
}: {
  screen: Screen
  lang: Lang
  priority?: boolean
  className?: string
  style?: CSSProperties
  /** A light band crosses the glass each time this changes. */
  sweep?: number
}) {
  const t = useT()
  const src = screenUrl(lang, screen)
  // `shown` is on screen; a new `src` fades in over it once it has loaded.
  const [shown, setShown] = useState(src)
  const [loaded, setLoaded] = useState<string | null>(null)
  const next = src === shown ? null : { src, loaded: loaded === src }

  const image = 'absolute inset-0 size-full object-cover object-top'
  return (
    <div className={`home-phone ${className}`} style={style} data-screen={next?.loaded ? next.src : shown}>
      <div className="home-phone-bezel">
        <div className="home-phone-screen">
          <img
            src={shown}
            alt={t.home.screens[screen]}
            width={1170}
            height={2532}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            loading={priority ? 'eager' : 'lazy'}
            className={image}
          />
          {next && (
            <img
              key={next.src}
              src={next.src}
              alt=""
              aria-hidden
              width={1170}
              height={2532}
              decoding="async"
              onLoad={() => setLoaded(next.src)}
              onTransitionEnd={() => setShown(next.src)}
              className={`${image} transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${next.loaded ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          <span aria-hidden className="home-phone-sweep" />
          {sweep !== undefined && <span key={sweep} aria-hidden className="home-phone-sweep home-phone-sweep-run" />}
          <span aria-hidden className="home-phone-island" />
        </div>
      </div>
    </div>
  )
}
