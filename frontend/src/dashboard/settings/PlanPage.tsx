import { Check, ChevronDown, CircleCheck, Copy, Download, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, ErrorMessage, ErrorState, IconButton, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { drawKhqr, isIOS } from '../../lib/khqrImage.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate } from '../../lib/orders.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/support.ts'
import type { Plan, PlanPeriod, Store } from '../../lib/types.ts'
import { OpenShopButton } from '../OpenShop.tsx'
import { usePlan, useSayPaid, useStore } from '../queries.ts'

/** "9.99" → "$9.99", "99.00" → "$99": prices read better without ".00". */
const usd = (amount: string | number) => formatMoney(amount, 'USD').replace(/\.00$/, '')
/** A calendar day from the API with its year: "Nov 30, 2026" ("" for none:
 * in setup). */
const day = (ymd: string | null) => (ymd ? formatDate(`${ymd}T00:00`) : '')

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
    <div className="space-y-4">
      <Status plan={plan.data} />
      {/* Nothing to pay before the shop opens: its trial comes first. */}
      {plan.data.stage !== 'setup' && <Pay plan={plan.data} store={store.data} />}
      <Included />
      {plan.data.payments.length > 0 && <Payments plan={plan.data} />}
    </div>
  )
}

/** How long the shop has, at a glance (founder's pick 23A, 2026-10-25):
 * the trial or the plan, its last day, the days left and a bar for them;
 * in setup, Open shop; overdue or stopped, what happens, in amber. */
function Status({ plan }: { plan: Plan }) {
  const p = useT().settings.plan
  const running = plan.stage === 'active' || plan.stage === 'ending_soon'
  // The bar: the days left of the trial (30) or of the last period paid.
  const last = plan.payments.find((pay) => pay.status === 'paid' && pay.covers_from && pay.covers_until)
  const span = plan.on_trial
    ? 30
    : last
      ? Math.round((Date.parse(`${last.covers_until}T00:00Z`) - Date.parse(`${last.covers_from}T00:00Z`)) / 86_400_000) + 1
      : null
  const left = plan.days_left ?? 0
  return (
    <Card className="space-y-3 p-4 sm:p-6">
      {plan.stage === 'setup' ? (
        <>
          <div>
            <p className="text-lg font-semibold text-slate-900">{p.notOpen}</p>
            <p className="mt-1 text-sm text-slate-600">{p.notOpenText(usd(plan.prices.month), usd(plan.prices.year))}</p>
          </div>
          <OpenShopButton />
        </>
      ) : running ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900">{plan.on_trial ? p.freeTrial : p.standard}</p>
              <p className="text-sm text-slate-500">{p.until(day(plan.paid_until))}</p>
            </div>
            <p className={`shrink-0 text-right text-sm ${plan.stage === 'ending_soon' ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>
              {p.daysLeft(left)}
            </p>
          </div>
          {span && (
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-navy-50">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, Math.min(100, (left / span) * 100))}%` }} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-1 text-sm leading-6 text-amber-800">
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
    </Card>
  )
}

/** What the plan includes, folded: it's the same for everyone. */
function Included() {
  const p = useT().settings.plan
  return (
    <Card>
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-medium text-slate-900 sm:px-6 [&::-webkit-details-marker]:hidden">
          {p.includes}
          <ChevronDown aria-hidden className="size-5 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="space-y-1.5 px-4 pb-4 text-sm leading-6 text-slate-600 sm:px-6">
          {[p.includesEverything, p.includesStaff, p.includesHosting].map((line) => (
            <li key={line} className="flex gap-2">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-navy-600" />
              {line}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  )
}

/** Monthly or yearly, as two halves of one switch, the yearly saving in
 * its label. */
function PeriodChoice({ plan, period, onChange }: { plan: Plan; period: PlanPeriod; onChange: (period: PlanPeriod) => void }) {
  const p = useT().settings.plan
  const cents = (amount: string) => Math.round(Number(amount) * 100)
  const saving = (cents(plan.prices.month) * 12 - cents(plan.prices.year)) / 100
  const options: { id: PlanPeriod; label: string }[] = [
    { id: 'month', label: p.monthly },
    { id: 'year', label: saving > 0 ? `${p.yearly} · ${p.save(usd(saving))}` : p.yearly },
  ]
  return (
    <div role="group" aria-label={p.pay} className="flex rounded-xl bg-slate-100 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={period === option.id}
          onClick={() => onChange(option.id)}
          className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
            period === option.id ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** One Pay card (founder's pick 23A, 2026-10-25): monthly or yearly, the
 * price, and one button; Oak's KHQR, the shop's code and "I've paid"
 * open after it (else Oak's bank account, or a message to Oak Order).
 * During the trial the button says Pay early (UX check #23: no one should
 * think they must pay on day one). */
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
  // Opened by its button; already open once they said they paid.
  const [open, setOpen] = useState(Boolean(claim))
  const early = plan.on_trial && plan.stage === 'active'

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
      <p className="text-slate-600">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{price}</span>{' '}
        {period === 'month' ? p.aMonth : p.aYear}
      </p>
      {!open && (
        <>
          <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            {(early ? p.payEarlyBy : p.payBy_)(price)}
          </Button>
          {early && <p className="-mt-2 text-xs leading-5 text-slate-500">{p.payEarlyHint(day(plan.paid_until))}</p>}
        </>
      )}
      {open && (
      <>
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
          {/* Plain, as on a customer's order page: saving the QR is the
              main step, "I've paid" comes after paying (UX check #23). */}
          <Button
            size="lg"
            variant="secondary"
            loading={sayPaid.isPending}
            onClick={() => sayPaid.mutate(period)}
            className="w-full sm:w-auto"
          >
            {p.iPaid}
          </Button>
          <p className="text-xs leading-5 text-slate-500">{p.iPaidHint}</p>
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500">{p.carriesOn}</p>
      </>
      )}
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
      <Button icon={Download} onClick={save} className="mt-2 w-full">
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
