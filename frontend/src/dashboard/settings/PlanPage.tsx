import { Check, CircleCheck, Copy, Download, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Badge, Button, ErrorMessage, ErrorState, IconButton, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { drawKhqr, isIOS } from '../../lib/khqrImage.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate } from '../../lib/orders.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/support.ts'
import type { Plan, PlanPeriod, Store } from '../../lib/types.ts'
import { usePlan, useSayPaid, useStore } from '../queries.ts'

/** "9.99" → "$9.99", "99.00" → "$99": prices read better without ".00". */
const usd = (amount: string | number) => formatMoney(amount, 'USD').replace(/\.00$/, '')
/** A calendar day from the API with its year: "Nov 30, 2026". */
const day = (ymd: string) => formatDate(`${ymd}T00:00`)

/** Settings → Plan: the shop's plan with Oak Order (01_PRODUCT.md §33.1):
 * the free trial or the paid-until date, what it includes, and paying Oak
 * by hand until ABA PayWay (2026-10-14): Oak's KHQR (the shop's code as
 * its bill number) or bank account, the shop's code, and "I've paid",
 * which Oak Order checks; then the payments so far. */
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

/** Monthly or yearly. */
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

/** Paying Oak by hand: the shop's code, Oak's KHQR or bank account (or a
 * message to Oak Order when neither is set), and "I've paid". */
function Pay({ plan, store }: { plan: Plan; store: Store }) {
  const t = useT()
  const p = t.settings.plan
  const { toast } = useFeedback()
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const sayPaid = useSayPaid()
  const price = usd(plan.prices[period])
  const khqr = period === 'month' ? plan.pay_to.khqr_month : plan.pay_to.khqr_year
  const bank = plan.pay_to.bank
  const claim = plan.claim

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(t.common.copied)
    } catch {
      // No clipboard (an old in-app browser): the code is on screen.
    }
  }

  return (
    <Section title={p.pay}>
      <PeriodChoice plan={plan} period={period} onChange={setPeriod} />
      <div className="flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600">{p.yourCode}</p>
          <p className="font-mono text-lg font-bold tracking-wide text-slate-900">{plan.code}</p>
        </div>
        <IconButton label={t.common.copied} icon={Copy} onClick={() => copy(plan.code)} />
      </div>
      <p className="-mt-2 text-xs leading-5 text-slate-500">{p.codeHint}</p>
      {khqr && <OakKhqr khqr={khqr} name={plan.pay_to.khqr_name ?? 'Oak Order'} amount={price} code={plan.code} />}
      {bank && (
        <div className="text-sm">
          <p className="mb-1.5 font-medium text-slate-700">{khqr ? p.orTransfer : p.transferTo}</p>
          <dl className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {[
              [p.bank, bank.bank_name],
              [p.accountName, bank.account_name],
              [p.accountNumber, bank.account_number],
            ].map(([label, value]) => (
              <div key={label} className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-1">
                <dt className="text-slate-500">{label}</dt>
                <dd className="flex items-center gap-1 font-medium text-slate-900">
                  {value}
                  {label === p.accountNumber && <IconButton label={t.common.copied} icon={Copy} onClick={() => copy(value)} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {!khqr && !bank && (
        <>
          <p className="text-sm leading-6 text-slate-600">{SUPPORT_TELEGRAM ? p.howToPay : p.howToPayContact}</p>
          {SUPPORT_TELEGRAM && (
            <a
              href={supportLink(p.payMessage(price, period === 'month' ? p.aMonth : p.aYear, store.name, plan.code))}
              target="_blank"
              rel="noreferrer"
              className={`${buttonClass('secondary')} w-full sm:w-auto`}
            >
              <Send aria-hidden className="size-4" />
              {p.payOnTelegram(price)}
            </a>
          )}
        </>
      )}
      {claim ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200 ring-inset">
          <CircleCheck aria-hidden className="mt-1 size-4 shrink-0 text-emerald-600" />
          {p.waiting(usd(claim.amount), claim.period === 'month' ? p.aMonth : p.aYear, formatDate(claim.created_at))}
        </p>
      ) : (
        <div className="space-y-2">
          <ErrorMessage error={sayPaid.error} />
          <Button size="lg" loading={sayPaid.isPending} onClick={() => sayPaid.mutate(period)} className="w-full sm:w-auto">
            {p.iPaid}
          </Button>
          <p className="text-xs leading-5 text-slate-500">{p.iPaidHint}</p>
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500">{p.carriesOn}</p>
    </Section>
  )
}

/** Oak's KHQR for this amount, the shop's code as its bill number: saved
 * to photos on a phone (bank apps pick it from there), scanned on a laptop. */
function OakKhqr({ khqr, name, amount, code }: { khqr: string; name: string; amount: string; code: string }) {
  const p = useT().settings.plan
  const caption = p.khqrCaption(code)
  const image = useMemo(() => drawKhqr({ code: khqr, name, amount, caption }), [khqr, name, amount, caption])

  async function save() {
    const fileName = `oak-order-${code}.png`
    const blob = await new Promise<Blob | null>((resolve) => image.canvas.toBlob(resolve, 'image/png'))
    const file = blob && new File([blob], fileName, { type: 'image/png' })
    if (file && isIOS() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
      } catch {
        // Closed the share sheet.
      }
      return
    }
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
  }

  return (
    <div>
      <img src={image.url} alt={`KHQR ${amount} ${name}`} className="mx-auto w-full max-w-60 rounded-xl border border-slate-200 shadow-sm" />
      <p className="mt-2 text-center text-xs text-slate-500">{p.scanToPay}</p>
      <Button variant="secondary" icon={Download} onClick={save} className="mt-2 w-full">
        {p.saveQr}
      </Button>
    </div>
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
            {payment.status === 'paid' && payment.paid_on && payment.covers_from && payment.covers_until ? (
              <p className="mt-0.5 text-sm text-slate-500">{p.paidOn(day(payment.paid_on), day(payment.covers_from), day(payment.covers_until))}</p>
            ) : (
              <p className="mt-0.5 text-sm text-amber-800">
                {formatDate(payment.created_at)} · {p.notFound(payment.failure ?? '')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
