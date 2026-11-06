import { useState } from 'react'
import { formatMoney } from '../lib/money.ts'
import type { AdminShop as Shop } from '../lib/types.ts'
import { shortDay } from './shared.ts'

/** The shop's logo, round as customers see it, or its first letter. */
export function ShopLogo({ shop, size = 'size-9' }: { shop: Pick<Shop, 'name' | 'logo_url'>; size?: string }) {
  const [failed, setFailed] = useState(false)
  if (shop.logo_url && !failed) {
    return <img src={shop.logo_url} alt="" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-navy-50 font-semibold text-navy-700`}>
      {[...shop.name.trim()][0]?.toUpperCase()}
    </span>
  )
}

/** Where a shop stands, in words; red and amber on the words only. */
export function StageWords({ shop }: { shop: Shop }) {
  if (!shop.is_open) return <span className="text-slate-500">Closed</span>
  if (shop.claim) return <span className="font-semibold text-navy-700">Says paid {formatMoney(shop.claim.amount, 'USD')}</span>
  switch (shop.stage) {
    case 'stopped':
      return <span className="font-semibold text-red-700">No new orders</span>
    case 'overdue':
      return <span className="font-semibold text-red-700">Unpaid · pay by {shop.pay_by ? shortDay(shop.pay_by) : ''}</span>
    case 'ending_soon':
      return <span className="font-semibold text-amber-700">{shop.on_trial ? 'Trial ends' : 'Ends'} {shop.paid_until ? shortDay(shop.paid_until) : ''}</span>
    case 'setup':
      return <span className="text-slate-500">Setup</span>
    default:
      return <span className="text-slate-500">{shop.on_trial ? 'Trial' : 'Paying'}</span>
  }
}
