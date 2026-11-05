import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useLang, useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'
import { outlineButton, solidButton } from './buttons.ts'
import { PhoneStill } from './PhoneStill.tsx'
import { DEMO_SHOP } from './screens.ts'

/** The first screen: what Oak Order does, the two ways in, the free days,
 * and the phone with the demo shop on it. On phones the phone comes under
 * the buttons, its top showing, so people scroll. */
export function Hero() {
  const t = useT()
  const { lang } = useLang()
  const prices = usePlanPrices()
  const hero = t.home.hero
  return (
    <section className="relative px-5 pt-8 pb-20 sm:px-8 sm:pt-14 lg:pt-20 lg:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <div>
          <h1 className="home-display text-[clamp(2.15rem,8.6vw,4.75rem)] lg:text-[clamp(3.5rem,5.4vw,4.75rem)]">
            {t.auth.home.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">{hero.lead}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link data-cta="create" to="/register" className={solidButton}>
              {t.auth.createYourStore}
            </Link>
            <Link data-cta="demo" to={`/shop/${DEMO_SHOP}`} className={outlineButton}>
              {hero.demo}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/50">{hero.demoNote}</p>
          <p className="mt-7 inline-flex items-center gap-2 border-t border-champagne/30 pt-4 text-sm font-medium text-champagne">
            <Sparkles aria-hidden className="size-4 shrink-0" />
            {hero.free(prices.trial)}
          </p>
        </div>
        <div className="relative flex justify-center">
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -z-10 size-[130%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-night-glow)_80%,transparent),transparent)]"
          />
          <PhoneStill
            screen="shop"
            lang={lang}
            priority
            className="w-[min(70vw,290px)] [transform:perspective(1600px)_rotateY(-12deg)_rotateX(4deg)] lg:w-[330px]"
          />
        </div>
      </div>
    </section>
  )
}
