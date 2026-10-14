import { Check, Send } from 'lucide-react'
import { useState } from 'react'
import { buttonClass } from '../../components/styles.ts'
import { Badge, ErrorState, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate } from '../../lib/orders.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/support.ts'
import type { Plan, PlanPeriod, Store } from '../../lib/types.ts'
import { usePlan, useStore } from '../queries.ts'

/** "9.99" → "$9.99", "99.00" → "$99": prices read better without ".00". */
const usd = (amount: string | number) => formatMoney(amount, 'USD').replace(/\.00$/, '')
/** A calendar day from the API with its year: "Nov 30, 2026". */
const day = (ymd: string) => formatDate(`${ymd}T00:00`)

/** Settings → Plan: the shop's plan with Oak Order (01_PRODUCT.md §33.1):
 * the free trial or the paid-until date, what it includes, how to pay,
 * and the payments so far. The app doesn't take payments yet: the seller
 * messages Oak Order, who records the payment (python -m app.admin paid). */
export function PlanPage() {
  const plan = usePlan()
  const store = useStore()
  if (plan.isPending || store.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />
  if (plan.error || store.error) {
    return (
      <ErrorState
        error={plan.error ?? store.error}
        onRetry={() => {
          plan.refetch()
          store.refetch()
        }}
      />
    )
  }
  return (
    <div className="space-y-6">
      <Status plan={plan.data} />
      <Pay plan={plan.data} store={store.data} />
      {plan.data.payments.length > 0 && <Payments plan={plan.data} />}
    </div>
  )
}

function Status({ plan }: { plan: Plan }) {
  const p = useT().settings.plan
  const running = plan.stage === 'active' || plan.stage === 'ending_soon'
  return (
    <Section title={plan.on_trial ? p.freeTrial : p.standard}>
      {running ? (
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-lg font-semibold text-slate-900">
              {(plan.on_trial ? p.freeUntil : p.paidUntil)(day(plan.paid_until))}
            </p>
            <Badge tone={plan.stage === 'ending_soon' ? 'amber' : 'neutral'}>{p.daysLeft(plan.days_left)}</Badge>
          </div>
          {plan.on_trial && <p className="mt-1 text-sm text-slate-600">{p.afterTrial(usd(plan.prices.month), usd(plan.prices.year))}</p>}
        </div>
      ) : (
        <div className="space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 ring-1 ring-amber-200 ring-inset">
          {plan.stage === 'overdue' ? (
            <>
              <p className="font-semibold">{(plan.on_trial ? p.trialEnded : p.planEnded)(day(plan.paid_until))}</p>
              <p>{p.payBy(day(plan.pay_by))}</p>
            </>
          ) : (
            <>
              <p className="font-semibold">{p.stopped}</p>
              <p>{p.stoppedNote}</p>
            </>
          )}
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{p.includes}</h3>
        <ul className="space-y-1.5 text-sm leading-6 text-slate-600">
          {[p.includesEverything, p.includesStaff, p.includesHosting].map((line) => (
            <li key={line} className="flex gap-2">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-navy-600" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/** Monthly or yearly, then a message to Oak Order with the amount and the
 * shop already typed. */
function Pay({ plan, store }: { plan: Plan; store: Store }) {
  const p = useT().settings.plan
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const cents = (amount: string) => Math.round(Number(amount) * 100)
  const saving = (cents(plan.prices.month) * 12 - cents(plan.prices.year)) / 100
  const price = usd(plan.prices[period])
  const options: { id: PlanPeriod; label: string; price: string; note?: string }[] = [
    { id: 'month', label: p.monthly, price: p.perMonth(usd(plan.prices.month)) },
    { id: 'year', label: p.yearly, price: p.perYear(usd(plan.prices.year)), note: saving > 0 ? p.save(usd(saving)) : undefined },
  ]
  const message = p.payMessage(price, period === 'month' ? p.aMonth : p.aYear, store.name, `${location.origin}/shop/${store.slug}`)
  return (
    <Section title={p.pay}>
      <div role="group" aria-label={p.pay} className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={period === option.id}
            onClick={() => setPeriod(option.id)}
            className={`rounded-xl px-3.5 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 ${
              period === option.id ? 'bg-navy-50 ring-2 ring-navy-600' : 'ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
            <span className="mt-0.5 block text-sm text-slate-600">{option.price}</span>
            {option.note && <span className="mt-1 block text-xs font-semibold text-navy-700">{option.note}</span>}
          </button>
        ))}
      </div>
      <p className="text-sm leading-6 text-slate-600">{SUPPORT_TELEGRAM ? p.howToPay : p.howToPayContact}</p>
      {SUPPORT_TELEGRAM && (
        <a href={supportLink(message)} target="_blank" rel="noreferrer" className={`${buttonClass('primary', 'lg')} w-full sm:w-auto`}>
          <Send aria-hidden className="size-4" />
          {p.payOnTelegram(price)}
        </a>
      )}
      <p className="text-xs leading-5 text-slate-500">{p.carriesOn}</p>
    </Section>
  )
}

function Payments({ plan }: { plan: Plan }) {
  const p = useT().settings.plan
  return (
    <Section title={p.payments}>
      <ul className="-my-3 divide-y divide-slate-100">
        {plan.payments.map((payment) => (
          <li key={payment.id} className="py-3">
            <p className="text-sm font-medium text-slate-900">
              {usd(payment.amount)} · {payment.period === 'month' ? p.monthly : p.yearly}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {p.paidOn(day(payment.paid_on), day(payment.covers_from), day(payment.covers_until))}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
