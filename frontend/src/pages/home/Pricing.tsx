import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'
import { solidButton } from './buttons.ts'

/** The price as three cards in the first card's style (founder,
 * 2026-11-06: "just separate, one for month, one for year and free"): the
 * free days, monthly and yearly, each with a champagne hairline; then one
 * Create your shop, since sign-up is the same for all three (monthly or
 * yearly is chosen when paying). Prices and the free days come from the
 * admin's settings (GET /plan/prices). */
export function Pricing() {
  const t = useT()
  const prices = usePlanPrices()
  const pricing = t.home.pricing
  const plans = [pricing.everything, pricing.staff, pricing.byKhqr]
  const cards: { key: string; label: string; price: string; per: string; save?: string; points: string[] }[] = [
    {
      key: 'free',
      label: pricing.firstDays(prices.trial),
      price: pricing.free,
      per: pricing.ofSelling,
      points: [pricing.startsOpen, pricing.noCard],
    },
    { key: 'month', label: pricing.monthly, price: prices.month, per: pricing.aMonth, points: plans },
    {
      key: 'year',
      label: pricing.yearly,
      price: prices.year,
      per: pricing.aYear,
      save: prices.save ? pricing.save(prices.save) : undefined,
      points: plans,
    },
  ]
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p data-reveal className="home-eyebrow">
          {pricing.eyebrow}
        </p>
        <h2 data-reveal="wipe" className="home-display mt-3 text-[clamp(1.85rem,6vw,3.25rem)]">
          {pricing.plan}
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <li
              key={card.key}
              data-reveal
              style={{ '--i': index } as CSSProperties}
              className="relative flex flex-col rounded-3xl border border-champagne/35 bg-surface p-6 shadow-card sm:p-7"
            >
              <span
                aria-hidden
                className="absolute inset-x-10 -top-px h-px bg-[linear-gradient(90deg,transparent,var(--color-champagne),transparent)]"
              />
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-500">{card.label}</h3>
                {card.save && <p className="text-sm font-semibold text-champagne">{card.save}</p>}
              </div>
              <p className="home-display mt-3 text-5xl md:text-4xl lg:text-5xl">{card.price}</p>
              <p className="mt-1 text-slate-500">{card.per}</p>
              <ul className="mt-5 space-y-2.5 border-t border-slate-200 pt-5">
                {card.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[15px] leading-snug text-slate-700">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-champagne" />
                    {point}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div data-reveal className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link data-cta="create" to="/register" className={`${solidButton} w-full sm:w-auto sm:px-10`}>
            {t.auth.createYourStore}
          </Link>
          <p className="text-sm text-slate-500">{pricing.setup}</p>
        </div>
      </div>
    </section>
  )
}
