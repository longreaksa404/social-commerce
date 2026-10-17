import { Store, Tag, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import type { ShopStore } from '../lib/types.ts'

type Line = { icon: LucideIcon; text: string }

/** How buying here works, in up to three short lines under the shop's
 * name (UX check #12, 2026-10-17; tags before): delivery with its free
 * rules and pickup, the ways to pay, the discounts. Who delivers and the
 * pickup address show at checkout. */
export function ShopInfo({ shop, className = '' }: { shop: ShopStore; className?: string }) {
  const t = useT()
  const i = t.shop.info
  const money = (amount: string) => formatMoney(amount, shop.currency)
  const { delivery } = shop
  const lines: Line[] = []

  const getting: string[] = []
  if (delivery.own_delivery || delivery.couriers.length > 0) {
    if (Number(delivery.fee) > 0) {
      getting.push(i.deliveryFee(money(delivery.fee)))
      const freeRules = [
        delivery.free_from_amount !== null && t.checkout.freeFromAmount(money(delivery.free_from_amount)),
        delivery.free_from_items !== null && t.checkout.freeFromItems(delivery.free_from_items),
      ].filter((rule) => rule !== false)
      if (freeRules.length) getting.push(i.freeOnShort(freeRules))
    } else getting.push(i.freeDelivery)
    if (delivery.pickup) getting.push(i.pickupShort)
  } else if (delivery.pickup) getting.push(i.pickup)
  if (getting.length) lines.push({ icon: delivery.own_delivery || delivery.couriers.length ? Truck : Store, text: getting.join(' · ') })

  const ways = PAYMENT_METHOD_ORDER.filter((m) => shop.payment_methods.includes(m)).map((m) => t.status.paymentMethod[m])
  if (ways.length) lines.push({ icon: Wallet, text: i.payBy(ways) })

  const discounts = [...shop.discounts].sort((a, b) => Number(a.min_subtotal) - Number(b.min_subtotal))
  if (discounts.length) {
    lines.push({ icon: Tag, text: discounts.map((r) => i.discount(money(r.amount_off), money(r.min_subtotal))).join(' · ') })
  }
  if (lines.length === 0) return null

  return (
    <section aria-label={i.title} className={className}>
      <ul className="space-y-1.5">
        {lines.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2 text-sm leading-5 text-slate-700">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-navy-700" />
            <span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
