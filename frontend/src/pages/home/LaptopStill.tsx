import type { Lang } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { laptopUrl } from './screens.ts'

/** A modern MacBook drawn in CSS (founder, 2026-11-06: "use the modern
 * macbook"): thin black bezels in a silver rim, the notch in a plain light
 * menu bar, a slim silver base with the scoop at the front. On its screen
 * the seller's Orders page (public/home/<lang>/laptop.webp, made by
 * backend/marketing/laptop_shot.py and home_images.py). Beside the phone
 * on the first screen: Oak Order on a phone and on a laptop. */
export function LaptopStill({ lang, className = '' }: { lang: Lang; className?: string }) {
  const t = useT()
  return (
    <div className={`home-laptop ${className}`}>
      <div className="home-laptop-lid">
        <div className="home-laptop-screen">
          <div aria-hidden className="home-laptop-bar">
            <span className="home-laptop-notch" />
          </div>
          <img
            src={laptopUrl(lang)}
            alt={t.home.screens.laptop}
            width={1440}
            height={900}
            decoding="async"
            fetchPriority="high"
            className="min-h-0 w-full flex-1 object-cover object-top-left"
          />
        </div>
      </div>
      <div aria-hidden className="home-laptop-base" />
    </div>
  )
}
