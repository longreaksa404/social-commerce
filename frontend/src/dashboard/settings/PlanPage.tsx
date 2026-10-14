import { useMutation } from '@tanstack/react-query'
import { Check, CircleAlert, LoaderCircle, Send, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Badge, Button, ErrorMessage, ErrorState, Section, Skeleton, Switch } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate } from '../../lib/orders.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/support.ts'
import type { Checkout, Plan, PlanPeriod, Store } from '../../lib/types.ts'
import { usePlan, usePlanPayment, useStore, useTurnOffAutoCharge } from '../queries.ts'

/** "9.99" → "$9.99", "99.00" → "$99": prices read better without ".00". */
const usd = (amount: string | number) => formatMoney(amount, 'USD').replace(/\.00$/, '')
/** A calendar day from the API with its year: "Nov 30, 2026". */
const day = (ymd: string) => formatDate(`${ymd}T00:00`)

/** Settings → Plan: the shop's plan with Oak Order (01_PRODUCT.md §33.1):
 * the free trial or the paid-until date, what it includes, paying (Pay now
 * through ABA PayWay, with a monthly auto-charge if wanted; or a message
 * to Oak Order while PayWay isn't set up), and the payments so far. Back
 * from PayWay's page, `?payment=<id>` shows how that payment went. */
export function PlanPage() {
  const plan = usePlan()
  const store = useStore()
  const [params, setParams] = useSearchParams()
  const paymentId = params.get('payment')
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
      {paymentId && <PaymentResult id={paymentId} onClose={() => setParams({}, { replace: true })} />}
      <Status plan={plan.data} />
      {plan.data.auto_charge && <AutoCharge plan={plan.data} />}
      {plan.data.payway ? <PayNow plan={plan.data} /> : <PayByMessage plan={plan.data} store={store.data} />}
      {plan.data.payments.length > 0 && <Payments plan={plan.data} />}
    </div>
  )
}

/** How the payment just made on PayWay's page went: asked again every few
 * seconds while PayWay hasn't answered. */
function PaymentResult({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT()
  const p = t.settings.plan
  const payment = usePlanPayment(id)
  // The page asks for about a minute (usePlanPayment), then waits quietly.
  const [since] = useState(() => Date.now())
  const data = payment.data
  const waiting = !data || data.status === 'pending'
  const gaveUp = data?.status === 'pending' && payment.dataUpdatedAt - since > 55_000
  const tone = data?.status === 'failed' ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-navy-50 text-slate-900 ring-navy-100'
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm leading-6 ring-1 ring-inset ${tone}`}>
      {waiting && !gaveUp ? (
        <LoaderCircle aria-hidden className="mt-0.5 size-5 shrink-0 animate-spin text-navy-600" />
      ) : data?.status === 'paid' ? (
        <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      ) : (
        <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700" />
      )}
      <p className="min-w-0 flex-1 font-medium">
        {payment.error ? (
          <ErrorMessage error={payment.error} />
        ) : data?.status === 'paid' && data.covers_until ? (
          p.paidNow(day(data.covers_until))
        ) : data?.status === 'failed' ? (
          p.notPaid(data.failure ?? '')
        ) : gaveUp ? (
          p.stillWaiting
        ) : (
          p.checking
        )}
      </p>
      <button type="button" onClick={onClose} aria-label={t.common.close} className="-m-1 rounded-lg p-1 text-slate-500 hover:bg-white/60">
        <X aria-hidden className="size-4" />
      </button>
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
            <Badge tone={plan.stage === 'ending_soon' && !plan.auto_charge ? 'amber' : 'neutral'}>{p.daysLeft(plan.days_left)}</Badge>
          </div>
          {plan.on_trial && <p className="mt-1 text-sm text-slate-600">{p.afterTrial(usd(plan.prices.month), usd(plan.prices.year))}</p>}
        </div>
      ) : (
        <div className="space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 ring-1 ring-amber-200 ring-inset">
          {plan.stage === 'overdue' ? (
            plan.auto_charge && plan.charge_failed ? (
              <p className="font-semibold">{p.chargeFailed(plan.auto_charge.label, day(plan.pay_by))}</p>
            ) : (
              <>
                <p className="font-semibold">{(plan.on_trial ? p.trialEnded : p.planEnded)(day(plan.paid_until))}</p>
                <p>{p.payBy(day(plan.pay_by))}</p>
              </>
            )
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

function AutoCharge({ plan }: { plan: Plan }) {
  const p = useT().settings.plan
  const { confirm, toast } = useFeedback()
  const turnOff = useTurnOffAutoCharge()
  const auto = plan.auto_charge
  if (!auto) return null
  async function off() {
    const ok = await confirm({ title: p.turnOffTitle, message: p.turnOffMessage, confirmLabel: p.turnOff, danger: true })
    if (!ok) return
    turnOff.mutate(undefined, { onSuccess: () => toast(p.turnedOff) })
  }
  return (
    <Section title={p.autoChargeOn}>
      <p className="text-sm leading-6 text-slate-700">
        {auto.next_charge ? p.autoChargeNext(usd(auto.amount), auto.label, day(auto.next_charge)) : p.autoChargeAfterPay(usd(auto.amount), auto.label)}
      </p>
      <ErrorMessage error={turnOff.error} />
      <Button variant="secondary" loading={turnOff.isPending} onClick={off} className="w-full sm:w-auto">
        {p.turnOff}
      </Button>
    </Section>
  )
}

/** Monthly or yearly: the choice both ways of paying start with. */
function PeriodChoice({ plan, period, onChange }: { plan: Plan; period: PlanPeriod; onChange: (period: PlanPeriod) => void }) {
  const p = useT().settings.plan
  const cents = (amount: string) => Math.round(Number(amount) * 100)
  const saving = (cents(plan.prices.month) * 12 - cents(plan.prices.year)) / 100
  const options: { id: PlanPeriod; label: string; price: string; note?: string }[] = [
    { id: 'month', label: p.monthly, price: p.perMonth(usd(plan.prices.month)) },
    { id: 'year', label: p.yearly, price: p.perYear(usd(plan.prices.year)), note: saving > 0 ? p.save(usd(saving)) : undefined },
  ]
  return (
    <div role="group" aria-label={p.pay} className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={period === option.id}
          onClick={() => onChange(option.id)}
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
  )
}

/** The checkout form, posted by the browser itself: PayWay answers with
 * its page, and sends the seller back to this one when done. */
function goToPayway(checkout: Checkout) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = checkout.action
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.append(input)
  }
  document.body.append(form)
  form.submit()
}

/** Pay now through ABA PayWay; for the monthly plan, optionally with
 * auto-charge (an ABA account or a card, saved at PayWay). */
function PayNow({ plan }: { plan: Plan }) {
  const p = useT().settings.plan
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const [auto, setAuto] = useState(false)
  const [source, setSource] = useState<'aba' | 'card'>('aba')
  const withAuto = period === 'month' && auto && !plan.auto_charge
  const checkout = useMutation({
    mutationFn: () =>
      api<Checkout>('/seller/plan/checkout', {
        method: 'POST',
        body: { period, auto_charge: withAuto ? source : null },
      }),
    onSuccess: goToPayway,
  })
  const price = usd(plan.prices[period])
  return (
    <Section title={p.pay}>
      <PeriodChoice plan={plan} period={period} onChange={setPeriod} />
      {period === 'month' && !plan.auto_charge && (
        <div className="space-y-3">
          <Switch checked={auto} onChange={setAuto} label={p.autoChargeOffer} description={p.autoChargeOfferHint(price)} />
          {auto && (
            <div role="group" aria-label={p.autoChargeOffer} className="flex rounded-xl bg-slate-100 p-0.5">
              {(['aba', 'card'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={source === option}
                  onClick={() => setSource(option)}
                  className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                    source === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option === 'aba' ? p.withAba : p.withCard}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!withAuto && <p className="text-sm leading-6 text-slate-600">{p.payWays}</p>}
      <ErrorMessage error={checkout.error} />
      <Button size="lg" loading={checkout.isPending || checkout.isSuccess} onClick={() => checkout.mutate()} className="w-full sm:w-auto">
        {checkout.isPending || checkout.isSuccess ? p.opening : p.payNow(price)}
      </Button>
      <p className="text-xs leading-5 text-slate-500">{p.carriesOn}</p>
    </Section>
  )
}

/** Until PayWay is set up: a message to Oak Order with the amount and the
 * shop typed; Oak Order records the payment by hand. */
function PayByMessage({ plan, store }: { plan: Plan; store: Store }) {
  const p = useT().settings.plan
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const price = usd(plan.prices[period])
  const message = p.payMessage(price, period === 'month' ? p.aMonth : p.aYear, store.name, `${location.origin}/shop/${store.slug}`)
  return (
    <Section title={p.pay}>
      <PeriodChoice plan={plan} period={period} onChange={setPeriod} />
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
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900">
              {usd(payment.amount)} · {payment.period === 'month' ? p.monthly : p.yearly}
              {payment.method === 'payway_auto' && <Badge>{p.autoCharge}</Badge>}
            </p>
            {payment.status === 'paid' && payment.paid_on && payment.covers_from && payment.covers_until ? (
              <p className="mt-0.5 text-sm text-slate-500">{p.paidOn(day(payment.paid_on), day(payment.covers_from), day(payment.covers_until))}</p>
            ) : (
              <p className="mt-0.5 text-sm text-amber-800">
                {formatDate(payment.created_at)} · {p.failed(payment.failure ?? '')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
