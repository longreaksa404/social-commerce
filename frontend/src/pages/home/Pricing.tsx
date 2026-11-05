import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'
import { solidButton } from './buttons.ts'

/** One plan, one card, with a champagne hairline. Prices and the free days
 * come from the admin's settings (GET /plan/prices). */
export function Pricing() {
  const t = useT()
  const prices = usePlanPrices()
  const pricing = t.home.pricing
  const points = [pricing.trial(prices.trial), pricing.noCard, pricing.everything, pricing.setup]
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="relative mx-auto max-w-md rounded-3xl border border-champagne/35 bg-white/[0.04] p-7 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.85)] sm:p-9">
        <span
          aria-hidden
          className="absolute inset-x-10 -top-px h-px bg-[linear-gradient(90deg,transparent,var(--color-champagne),transparent)]"
        />
        <p className="home-eyebrow">{pricing.eyebrow}</p>
        <h2 className="mt-3 text-xl font-semibold">{pricing.plan}</h2>
        <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
          <span className="home-display text-6xl">{prices.month}</span>
          <span className="text-white/60">{pricing.aMonth}</span>
        </p>
        <p className="mt-2 text-white/70">
          {pricing.orYear(prices.year)}
          {prices.save && <span className="ml-2 font-medium text-champagne">{pricing.save(prices.save)}</span>}
        </p>
        <ul className="mt-7 space-y-3.5 border-t border-white/10 pt-7">
          {points.map((point) => (
            <li key={point} className="flex gap-3 leading-relaxed text-white/80">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-champagne" />
              {point}
            </li>
          ))}
        </ul>
        <Link data-cta="create" to="/register" className={`${solidButton} mt-8 w-full`}>
          {t.auth.createYourStore}
        </Link>
      </div>
    </section>
  )
}
