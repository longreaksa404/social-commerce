import { Store, Tag, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { cardClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import type { ShopStore } from '../lib/types.ts'

type Row = { icon: LucideIcon; text: string; detail?: string }

/** Delivery, pickup, payment and discounts in a few lines, so a customer
 * arriving from a post knows how buying here works before checkout. */
export function ShopInfo({ shop, className = '' }: { shop: ShopStore; className?: string }) {
  const t = useT()
  const i = t.shop.info
  const money = (amount: string) => formatMoney(amount, shop.currency)
  const { delivery } = shop
  const rows: Row[] = []

  const carriers = [...(delivery.own_delivery ? [i.theShop] : []), ...delivery.couriers]
  if (carriers.length > 0) {
    const freeRules = [
      delivery.free_from_amount !== null && t.checkout.freeFromAmount(money(delivery.free_from_amount)),
      delivery.free_from_items !== null && t.checkout.freeFromItems(delivery.free_from_items),
    ].filter((rule) => rule !== false)
    const text =
      Number(delivery.fee) > 0
        ? [i.deliveryFee(money(delivery.fee)), ...(freeRules.length ? [i.freeOn(freeRules)] : [])].join(' · ')
        : i.freeDelivery
    rows.push({ icon: Truck, text, detail: i.deliveredBy(carriers) })
  }
  if (delivery.pickup) rows.push({ icon: Store, text: i.pickup, detail: delivery.pickup.address })
  if (shop.payment_methods.length > 0) {
    const methods = PAYMENT_METHOD_ORDER.filter((method) => shop.payment_methods.includes(method))
    rows.push({ icon: Wallet, text: i.pay(methods.map((method) => i.method[method])) })
  }
  if (shop.discounts.length > 0) {
    const rules = [...shop.discounts].sort((a, b) => Number(a.min_subtotal) - Number(b.min_subtotal))
    rows.push({ icon: Tag, text: rules.map((r) => i.discount(money(r.amount_off), money(r.min_subtotal))).join(' · ') })
  }
  if (rows.length === 0) return null

  return (
    <section aria-label={i.title} className={className}>
      <ul className={`divide-y divide-slate-100 ${cardClass}`}>
        {rows.map(({ icon: Icon, text, detail }) => (
          <li key={text} className="flex gap-3 px-3.5 py-2.5">
            <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-emerald-700" />
            <div className="min-w-0 text-sm leading-5">
              <p className="text-slate-800">{text}</p>
              {detail && <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-slate-500">{detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
