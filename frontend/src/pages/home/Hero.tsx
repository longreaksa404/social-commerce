import { ArrowRight, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Phrases } from '../../i18n/Phrases.tsx'
import { useLang, useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'
import { outlineButton, solidButton } from './buttons.ts'
import { LaptopStill } from './LaptopStill.tsx'
import { Phone3D } from './Phone3D.tsx'
import { DEMO_SHOP } from './screens.ts'
import type { Intro } from './useIntro.ts'

/** When each part arrives in the opening (home.css, main[data-intro]). */
const after = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/** The first screen: what Oak Order does, the two ways in, the free days,
 * and Oak Order on a laptop (the seller's Orders) with a phone in front
 * (the demo shop), so it shows it works on both (founder, 2026-11-06). On
 * phones they come under the buttons, their tops showing, so people
 * scroll. They stay bright as they scroll away: dimming hid them just as
 * people scrolled to them (founder's pick 6A, 2026-11-06). */
export function Hero({ intro }: { intro: Intro }) {
  const t = useT()
  const { lang } = useLang()
  const prices = usePlanPrices()
  const hero = t.home.hero
  return (
    <section className="relative px-5 pt-6 pb-20 sm:px-8 sm:pt-14 lg:pt-20 lg:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <h1 className="home-display text-[clamp(2.15rem,8.6vw,4.75rem)] lg:text-[clamp(3.5rem,5.4vw,4.75rem)]">
            <Words text={t.auth.home.title} />
          </h1>
          <p className="home-intro-after mt-4 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl" style={after(1)}>
            {hero.lead}
          </p>
          <div className="home-intro-after mt-7 flex flex-col gap-3 sm:flex-row" style={after(1.1)}>
            <Link data-cta="create" to="/register" className={solidButton}>
              {t.auth.createYourStore}
            </Link>
            <Link data-cta="demo" to={`/shop/${DEMO_SHOP}`} className={outlineButton}>
              {hero.demo}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="home-intro-after mt-3 text-sm leading-relaxed text-slate-500" style={after(1.2)}>
            {hero.demoNote}
          </p>
          <p
            className="home-intro-after mt-5 inline-flex items-center gap-2 border-t border-champagne/30 pt-4 text-sm font-medium text-champagne"
            style={after(1.3)}
          >
            <Sparkles aria-hidden className="size-4 shrink-0" />
            {hero.free(prices.trial)}
          </p>
        </div>
        {/* The laptop at the back left, the phone in front at the right,
            standing a little taller. */}
        <div className="relative mx-auto w-full max-w-[34rem] pt-[12%] pb-[4%] lg:max-w-none">
          <div className="home-intro-laptop w-[84%] pl-[6%]">
            <LaptopStill lang={lang} />
          </div>
          <div className="home-intro-phone absolute right-[2%] bottom-0 w-[32%]">
            <Phone3D
              screen="shop"
              lang={lang}
              shot="hero"
              priority
              follow
              wait={intro === 'playing'}
              className="w-full [transform:perspective(1600px)_rotateY(-12deg)_rotateX(4deg)]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/** The headline, a phrase at a time in the opening (a word in English),
 * each kept on one line (Phrases). */
function Words({ text }: { text: string }) {
  return (
    <Phrases
      text={text}
      piece={(phrase, index) => (
        <span className="home-word whitespace-nowrap" style={{ '--w': index } as CSSProperties}>
          {phrase}
        </span>
      )}
    />
  )
}
