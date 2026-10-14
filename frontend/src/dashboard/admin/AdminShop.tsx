import { ExternalLink } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Badge, Button, ErrorMessage, ErrorState, Field, Input, PageHeader, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import type { AdminShopDetail, PlanPeriod } from '../../lib/types.ts'
import { useAccount, useAdminShop, useMarkPaid } from '../queries.ts'
import { STAGE_TONE, day } from './shared.ts'

const usd = (amount: string | number) => formatMoney(amount, 'USD')

/** /dashboard/admin/:storeId: one shop's plan, its payments, and "mark
 * paid" for a payment made by hand (0 gives free time). */
export function AdminShop() {
  const { storeId = '' } = useParams()
  const a = useT().admin
  const account = useAccount()
  const shop = useAdminShop(storeId)
  if (account.data && !account.data.is_admin) return <Navigate to="/dashboard" replace />
  return (
    <>
      <title>{shop.data?.name ?? a.title}</title>
      <PageHeader title={shop.data?.name ?? a.title} back="/dashboard/admin" />
      {shop.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : shop.error ? (
        <ErrorState error={shop.error} onRetry={() => shop.refetch()} />
      ) : (
        <div className="space-y-6">
          <Summary shop={shop.data} />
          <MarkPaid shop={shop.data} />
          <Payments shop={shop.data} />
        </div>
      )}
    </>
  )
}

function Summary({ shop }: { shop: AdminShopDetail }) {
  const a = useT().admin
  return (
    <Section
      title={`/shop/${shop.slug}`}
      action={
        <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
          <ExternalLink aria-hidden className="size-4" />
          {a.openShop}
        </a>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={STAGE_TONE[shop.stage]}>{a.stage[shop.stage]}</Badge>
        <Badge>{shop.on_trial ? a.trial : a.paying}</Badge>
        {!shop.is_open && <Badge tone="red">{a.closed}</Badge>}
      </div>
      <ul className="space-y-1 text-sm leading-6 text-slate-700">
        <li>{formatPhone(shop.login)}</li>
        <li>
          {a.paidUntil(day(shop.paid_until))}
          {shop.stage === 'overdue' && ` · ${a.payBy(day(shop.pay_by))}`}
        </li>
        {shop.auto_charge && <li>{shop.next_charge ? a.nextCharge(shop.auto_charge, day(shop.next_charge)) : a.autoChargeOnly(shop.auto_charge)}</li>}
        {shop.last_paid_on && <li>{a.lastPaid(day(shop.last_paid_on))}</li>}
        {shop.last_failure && <li className="text-amber-800">{a.lastFailure(shop.last_failure)}</li>}
        <li className="text-slate-500">{a.signedUp(formatDate(shop.created_at))}</li>
      </ul>
    </Section>
  )
}

function MarkPaid({ shop }: { shop: AdminShopDetail }) {
  const a = useT().admin
  const { confirm, toast } = useFeedback()
  const mark = useMarkPaid(shop.id)
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const price = period === 'month' ? '9.99' : '99.00'

  async function submit(event: FormEvent) {
    event.preventDefault()
    const paid = amount.trim() || price
    const ok = await confirm({
      title: a.confirmTitle(shop.name),
      message: a.confirmMessage(usd(paid), period === 'month' ? a.month : a.year),
      confirmLabel: a.markPaid,
    })
    if (!ok) return
    mark.mutate(
      { period, amount: amount.trim() || null, note: note.trim() || null },
      {
        onSuccess: (updated) => {
          toast(a.marked(day(updated.paid_until)))
          setAmount('')
          setNote('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <Section title={a.markPaid} description={a.markPaidHint}>
        <Field label={a.period}>
          <div role="group" className="flex rounded-xl bg-slate-100 p-0.5">
            {(['month', 'year'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                  period === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option === 'month' ? a.month : a.year}
              </button>
            ))}
          </div>
        </Field>
        <Field label={a.amount}>
          <Input type="number" inputMode="decimal" min="0" max="10000" step="0.01" leading="$" placeholder={price} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={a.note}>
          <Input maxLength={200} placeholder={a.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorMessage error={mark.error} />
        <Button type="submit" loading={mark.isPending} className="w-full sm:w-auto">
          {a.markPaid}
        </Button>
      </Section>
    </form>
  )
}

function Payments({ shop }: { shop: AdminShopDetail }) {
  const a = useT().admin
  return (
    <Section title={a.payments}>
      {shop.payments.length === 0 ? (
        <p className="text-sm text-slate-500">{a.noPayments}</p>
      ) : (
        <ul className="-my-3 divide-y divide-slate-100">
          {shop.payments.map((payment) => (
            <li key={payment.id} className="space-y-0.5 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                {usd(payment.amount)} · {payment.period === 'month' ? a.month : a.year}
                <Badge>{a.method[payment.method]}</Badge>
                <Badge tone={payment.status === 'paid' ? 'green' : payment.status === 'failed' ? 'amber' : 'neutral'}>
                  {a.status[payment.status]}
                </Badge>
              </p>
              <p className="text-slate-500">
                {formatDate(payment.created_at)}
                {payment.covers_from && payment.covers_until && ` · ${a.covers(day(payment.covers_from), day(payment.covers_until))}`}
              </p>
              {payment.failure && <p className="text-amber-800">{payment.failure}</p>}
              {payment.reference && <p className="text-slate-600">{payment.reference}</p>}
              {payment.tran_id && <p className="font-mono text-xs text-slate-400">{payment.tran_id}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
