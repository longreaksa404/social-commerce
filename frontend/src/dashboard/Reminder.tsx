import { CalendarClock, ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '../i18n/useT.ts'
import { formatCalendarDay } from '../lib/orders.ts'
import { usePlan, useRole } from './queries.ts'

/** A strip that opens the setting it's about (for the owner; staff can't
 * open Settings, so they just get the news). Amber words on a plain card:
 * no amber box (founder, 2026-10-15). */
export function Reminder({ icon: Icon, setting, children }: { icon: LucideIcon; setting: string; children: string }) {
  const role = useRole()
  const className =
    '-mx-4 mb-4 flex min-h-12 items-center gap-3 border-y border-slate-200 bg-surface px-4 py-2.5 text-sm font-medium text-amber-800 sm:mx-0 sm:rounded-2xl sm:border'
  const content = (
    <>
      <Icon aria-hidden className="size-5 shrink-0 text-amber-700" />
      <span className="min-w-0 flex-1">{children}</span>
    </>
  )
  if (role !== 'owner') return <p className={className}>{content}</p>
  return (
    <Link
      to={`/dashboard/settings/${setting}`}
      className={`${className} transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
    >
      {content}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}

/** The shop's plan with Oak Order running out (01_PRODUCT.md §33.1): its
 * last 6 days, the 7 days to pay, then no new orders. It's also the
 * dashboard's payment reminder for shops without Telegram (the daily run
 * reminds the others there). Staff only hear when orders have stopped:
 * paying is the owner's. `stoppedOnly`: where only
 * that matters (adding an order). */
export function PlanReminder({ stoppedOnly = false }: { stoppedOnly?: boolean }) {
  const plan = usePlan()
  const role = useRole()
  const o = useT().orders
  // Setup has its own place: the Orders tab's empty state (OpenShop.tsx).
  if (!plan.data || !role || plan.data.stage === 'active' || plan.data.stage === 'setup') return null
  const { stage, on_trial: trial, paid_until, pay_by, claim } = plan.data
  if (stage !== 'stopped' && (stoppedOnly || role !== 'owner')) return null
  const text =
    stage === 'stopped'
      ? role === 'owner'
        ? o.planStopped
        : o.planStoppedStaff
      : claim
        ? o.planClaimed // said "I've paid": nothing more for the seller to do
        : stage === 'overdue'
          ? (trial ? o.planOverdueTrial : o.planOverdue)(formatCalendarDay(pay_by ?? ''))
          : (trial ? o.planEndingTrial : o.planEnding)(formatCalendarDay(paid_until ?? ''))
  return (
    <Reminder icon={CalendarClock} setting="plan">
      {text}
    </Reminder>
  )
}
