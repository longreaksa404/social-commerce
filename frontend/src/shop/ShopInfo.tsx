import { Store, Tag, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import type { ShopStore } from '../lib/types.ts'

type Tag = { icon: LucideIcon; text: string }

/** Delivery, pickup, payment and discounts as a line of small tags, so a
 * customer arriving from a post knows how buying here works before
 * checkout, without it pushing the products down (redesign 2026-10-06;
 * who delivers and the pickup address show at checkout). */
export function ShopInfo({ shop, className = '' }: { shop: ShopStore; className?: string }) {
  const t = useT()
  const i = t.shop.info
  const money = (amount: string) => formatMoney(amount, shop.currency)
  const { delivery } = shop
  const tags: Tag[] = []

  if (delivery.own_delivery || delivery.couriers.length > 0) {
    if (Number(delivery.fee) > 0) {
      tags.push({ icon: Truck, text: i.deliveryFee(money(delivery.fee)) })
      const freeRules = [
        delivery.free_from_amount !== null && t.checkout.freeFromAmount(money(delivery.free_from_amount)),
        delivery.free_from_items !== null && t.checkout.freeFromItems(delivery.free_from_items),
      ].filter((rule) => rule !== false)
      if (freeRules.length) tags.push({ icon: Truck, text: i.freeOn(freeRules) })
    } else tags.push({ icon: Truck, text: i.freeDelivery })
  }
  if (delivery.pickup) tags.push({ icon: Store, text: i.pickup })
  for (const method of PAYMENT_METHOD_ORDER) {
    if (shop.payment_methods.includes(method)) tags.push({ icon: Wallet, text: t.status.paymentMethod[method] })
  }
  for (const rule of [...shop.discounts].sort((a, b) => Number(a.min_subtotal) - Number(b.min_subtotal))) {
    tags.push({ icon: Tag, text: i.discount(money(rule.amount_off), money(rule.min_subtotal)) })
  }
  if (tags.length === 0) return null

  return (
    <section aria-label={i.title} className={className}>
      <ul className="flex flex-wrap gap-2">
        {tags.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm leading-5 text-slate-700 ring-1 ring-slate-900/8"
          >
            <Icon aria-hidden className="size-4 shrink-0 text-navy-700" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
