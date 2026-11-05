import { ArrowRight, Sparkles } from 'lucide-react'
import { Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { useLang, useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'
import { outlineButton, solidButton } from './buttons.ts'
import { PhoneStill } from './PhoneStill.tsx'
import { DEMO_SHOP } from './screens.ts'

/** When each part arrives in the opening (home.css, main[data-intro]). */
const after = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/** The first screen: what Oak Order does, the two ways in, the free days,
 * and the phone with the demo shop on it. On phones the phone comes under
 * the buttons, its top showing, so people scroll. It dims and drifts back
 * as it scrolls away. */
export function Hero() {
  const t = useT()
  const { lang } = useLang()
  const prices = usePlanPrices()
  const hero = t.home.hero
  const leave = useLeave()
  return (
    <section className="relative px-5 pt-8 pb-20 sm:px-8 sm:pt-14 lg:pt-20 lg:pb-28">
      <div ref={leave} className="home-leave mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <div>
          <h1 className="home-display text-[clamp(2.15rem,8.6vw,4.75rem)] lg:text-[clamp(3.5rem,5.4vw,4.75rem)]">
            <Words text={t.auth.home.title} />
          </h1>
          <p className="home-intro-after mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl" style={after(1)}>
            {hero.lead}
          </p>
          <div className="home-intro-after mt-9 flex flex-col gap-3 sm:flex-row" style={after(1.1)}>
            <Link data-cta="create" to="/register" className={solidButton}>
              {t.auth.createYourStore}
            </Link>
            <Link data-cta="demo" to={`/shop/${DEMO_SHOP}`} className={outlineButton}>
              {hero.demo}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="home-intro-after mt-3 text-sm leading-relaxed text-white/50" style={after(1.2)}>
            {hero.demoNote}
          </p>
          <p
            className="home-intro-after mt-7 inline-flex items-center gap-2 border-t border-champagne/30 pt-4 text-sm font-medium text-champagne"
            style={after(1.3)}
          >
            <Sparkles aria-hidden className="size-4 shrink-0" />
            {hero.free(prices.trial)}
          </p>
        </div>
        <div className="relative flex justify-center">
          <div
            aria-hidden
            className="home-intro-glow absolute top-1/2 left-1/2 -z-10 size-[130%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-night-glow)_80%,transparent),transparent)]"
          />
          <div className="home-intro-phone">
            <PhoneStill
              screen="shop"
              lang={lang}
              priority
              className="w-[min(70vw,290px)] [transform:perspective(1600px)_rotateY(-12deg)_rotateX(4deg)] lg:w-[330px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/** The headline, a word at a time in the opening. Plain inline spans, so
 * Khmer, which runs whole phrases without spaces, still wraps inside one. */
function Words({ text }: { text: string }) {
  return text.split(' ').map((word, index) => (
    <Fragment key={index}>
      {index > 0 && ' '}
      <span className="home-word" style={{ '--w': index } as CSSProperties}>
        {word}
      </span>
    </Fragment>
  ))
}

/** Sets --leave on the element, 0 to 1 as the first screen scrolls away. */
function useLeave() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const element = ref.current
      if (!element) return
      const height = element.offsetHeight || 1
      element.style.setProperty('--leave', Math.min(1, Math.max(0, window.scrollY / height)).toFixed(3))
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    later()
    window.addEventListener('scroll', later, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', later)
    }
  }, [])
  return ref
}
