import { Tag } from 'lucide-react'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import type { ShopStore } from '../lib/types.ts'

// A shop has up to 5 bill discounts; the top of the shop shows this many.
const SHOWN = 3

/** The shop's bill discounts under its name, one per line in navy (shop
 * page check 7A): the 3 easiest to reach, smallest order first. Only the
 * discounts since 2026-11-04 (founder: "put only top 3 of Discount, remove
 * other"); the delivery fee and the ways to pay show at checkout. Nothing
 * when the shop has no discounts. */
export function ShopInfo({ shop, className = '' }: { shop: ShopStore; className?: string }) {
  const t = useT()
  const i = t.shop.info
  const money = (amount: string) => formatMoney(amount, shop.currency)
  const shown = [...shop.discounts]
    .sort((a, b) => Number(a.min_subtotal) - Number(b.min_subtotal))
    .slice(0, SHOWN)
  if (shown.length === 0) return null

  return (
    <section aria-label={i.title} className={className}>
      <ul className="space-y-1.5">
        {shown.map((rule) => (
          <li
            key={`${rule.min_subtotal}:${rule.amount_off}`}
            className="flex items-start gap-2 text-sm leading-5 font-semibold text-navy-700"
          >
            <Tag aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">{i.discount(money(rule.amount_off), money(rule.min_subtotal))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
