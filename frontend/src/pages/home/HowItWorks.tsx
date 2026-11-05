import { useLang, useT } from '../../i18n/useT.ts'
import { PhoneStill } from './PhoneStill.tsx'
import { STEP_SCREENS } from './screens.ts'

const STEPS = ['share', 'order', 'pay', 'track'] as const

/** How it works: four steps, each with its screen. */
export function HowItWorks() {
  const t = useT()
  const { lang } = useLang()
  const steps = t.home.steps
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="home-eyebrow">{steps.eyebrow}</p>
        <h2 className="home-display mt-3 max-w-2xl text-[clamp(1.85rem,6vw,3.25rem)]">{steps.title}</h2>
        <ol className="mt-14 grid gap-16 sm:grid-cols-2">
          {STEPS.map((key, index) => (
            <li key={key}>
              <span className="text-sm font-semibold text-champagne tabular-nums">0{index + 1}</span>
              <h3 className="mt-2 text-xl font-semibold">{steps[key].title}</h3>
              <p className="mt-2 leading-relaxed text-white/65">{steps[key].text}</p>
              <PhoneStill screen={STEP_SCREENS[index]} lang={lang} className="mt-8 w-[min(64vw,260px)]" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
