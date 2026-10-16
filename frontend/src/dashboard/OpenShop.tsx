import { Store as StoreIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFeedback } from '../components/feedback.ts'
import { Button, EmptyState } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatDate } from '../lib/orders.ts'
import { useOpenShop, usePlan, useRole } from './queries.ts'

/** "9.99" → "$9.99", "99.00" → "$99". */
const usd = (amount: string) => formatMoney(amount, 'USD').replace(/\.00$/, '')

/** The Open shop button (founder, 2026-10-16; 01_PRODUCT.md §33.1): a new
 * shop is in setup, where customers see "Opening soon" and nothing can be
 * ordered, until its owner opens it. It asks first, with the trial's end
 * and the price after it, then starts the 30-day free trial. */
export function OpenShopButton() {
  const plan = usePlan()
  const open = useOpenShop()
  const { confirm, toast } = useFeedback()
  const o = useT().orders.opening
  if (plan.data?.stage !== 'setup') return null
  const { trial_until: trialUntil, prices } = plan.data

  async function ask() {
    const ok = await confirm({
      title: o.confirmTitle,
      message: o.confirmMessage(trialUntil ? formatDate(`${trialUntil}T00:00`) : '', usd(prices.month), usd(prices.year)),
      confirmLabel: o.confirm,
    })
    if (!ok) return
    open.mutate(undefined, {
      onSuccess: () => toast(o.opened),
      onError: () => toast(o.failed, 'error'),
    })
  }

  return (
    <Button loading={open.isPending} icon={StoreIcon} onClick={ask}>
      {o.button}
    </Button>
  )
}

/** In place of what needs an open shop (the Orders tab with no orders, New
 * order): why nothing can come in yet, and Open shop for the owner. */
export function NotOpenYet({ title, text, extra }: { title?: string; text?: string; extra?: ReactNode }) {
  const role = useRole()
  const o = useT().orders.opening
  const owner = role === 'owner'
  return (
    <EmptyState
      icon={StoreIcon}
      title={title ?? o.title}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          {owner && <OpenShopButton />}
          {extra}
        </div>
      }
    >
      {owner ? (text ?? o.text) : o.staff}
    </EmptyState>
  )
}
