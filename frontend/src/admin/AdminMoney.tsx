import { ChevronLeft, ChevronRight, Download, Wallet } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorState, IconButton, PageHeader, Skeleton } from '../components/ui.tsx'
import { adminBlob } from '../lib/api.ts'
import { errorText } from '../lib/errors.ts'
import { formatMoney } from '../lib/money.ts'
import { phnomPenhDate } from '../lib/orders.ts'
import type { AdminPaymentRow, AdminPayments } from '../lib/types.ts'
import { Tile } from './AdminHome.tsx'
import { useAdminPayments, useCheckClaim } from './queries.ts'
import { shortDay } from './shared.ts'

const usd = (amount: string | number) => formatMoney(amount, 'USD')
const monthName = (year: number, month: number) => new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

/** /admin/money (part 17, founder's pick 9B, 2026-10-28): what still
 * needs the admin on top (every "I've paid" waiting, Found it on the
 * row), then a month's or a year's payments by what happened (paid, not
 * found, undone), with what was collected in it and its year, and the
 * same rows as an Excel file for the accounts. */
export function AdminMoney() {
  const [today] = useState(() => phnomPenhDate())
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const [month, setMonth] = useState<number | null>(Number(today.slice(5, 7)))
  const payments = useAdminPayments(year, month)
  const { toast } = useFeedback()

  function step(by: number) {
    if (month === null) return setYear(year + by)
    const index = year * 12 + month - 1 + by
    setYear(Math.floor(index / 12))
    setMonth((index % 12) + 1)
  }
  const label = month === null ? String(year) : `${monthName(year, month)} ${year}`
  const atNow = month === null ? year >= Number(today.slice(0, 4)) : year * 12 + month >= Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7))

  const download = useMutation({
    mutationFn: async () => {
      const blob = await adminBlob(`/admin/payments/export?year=${year}${month ? `&month=${month}` : ''}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `oak-payments-${year}${month ? `-${String(month).padStart(2, '0')}` : ''}.xlsx`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (error) => toast(errorText(error), 'error'),
  })

  return (
    <>
      <title>Payments · Oak Order admin</title>
      <PageHeader
        title="Payments"
        action={
          <Button variant="secondary" loading={download.isPending} onClick={() => download.mutate()}>
            <Download aria-hidden className="size-4" />
            Excel
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Show" className="flex rounded-xl bg-slate-100 p-0.5">
          {(['month', 'year'] as const).map((option) => {
            const on = option === 'year' ? month === null : month !== null
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => setMonth(option === 'year' ? null : month ?? (year === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 12))}
                className={`min-h-10 rounded-[10px] px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                  on ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option === 'month' ? 'Month' : 'Year'}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={month === null ? 'The year before' : 'The month before'} icon={ChevronLeft} onClick={() => step(-1)} />
          <span className="min-w-36 text-center text-sm font-semibold text-slate-900" aria-live="polite">
            {label}
          </span>
          <IconButton label={month === null ? 'The year after' : 'The month after'} icon={ChevronRight} onClick={() => step(1)} disabled={atNow} />
        </div>
      </div>
      {payments.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : payments.error ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : (
        <Lists data={payments.data} label={label} />
      )}
    </>
  )
}

function Lists({ data, label }: { data: AdminPayments; label: string }) {
  const by = (status: AdminPaymentRow['status']) => data.payments.filter((p) => p.status === status)
  const paid = by('paid')
  const failed = by('failed')
  const undone = by('void')
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:max-w-2xl">
        <Tile label={`Collected in ${label}`} value={usd(data.collected)}>
          {plural(data.paid, 'payment')}
        </Tile>
        {data.month !== null && (
          <Tile label={String(data.year)} value={usd(data.collected_year)}>
            the whole year
          </Tile>
        )}
      </div>
      {data.waiting.length > 0 && (
        <Group title={`Waiting · ${data.waiting.length}`}>
          {data.waiting.map((p) => (
            <Waiting key={p.id} payment={p} />
          ))}
        </Group>
      )}
      {data.payments.length === 0 ? (
        <EmptyState icon={Wallet} title={`No payments in ${label}`} />
      ) : (
        <>
          {paid.length > 0 && (
            <Group title={`Paid · ${paid.length}`}>
              {paid.map((p) => (
                <Row key={p.id} payment={p} sub={until(p)} note={p.reference} />
              ))}
            </Group>
          )}
          {failed.length > 0 && (
            <Group title={`Not found · ${failed.length}`}>
              {failed.map((p) => (
                <Row key={p.id} payment={p} sub={`Said ${shortDay(p.day)} · ${period(p)}`} note={p.failure} />
              ))}
            </Group>
          )}
          {undone.length > 0 && (
            <Group title={`Undone · ${undone.length}`}>
              {undone.map((p) => (
                <Row key={p.id} payment={p} sub={`${shortDay(p.day)} · ${period(p)}`} note={p.failure} struck />
              ))}
            </Group>
          )}
        </>
      )}
    </div>
  )
}

const period = (p: AdminPaymentRow) => (Number(p.amount) === 0 ? `free ${p.period}` : p.period)
const until = (p: AdminPaymentRow) => `${shortDay(p.day)} · ${period(p)}${p.covers_until ? ` · until ${shortDay(p.covers_until)}` : ''}`

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{title}</h2>
      <ul className={`${cardClass} divide-y divide-slate-100`}>{children}</ul>
    </section>
  )
}

function Row({ payment, sub, note, struck = false }: { payment: AdminPaymentRow; sub: string; note?: string | null; struck?: boolean }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <Link to={`/admin/shops/${payment.store_id}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
          {payment.shop}
        </Link>
        <span className="ml-2 text-xs font-semibold tracking-wide text-slate-500">{payment.code}</span>
        <p className="text-slate-500 tabular-nums">{sub}</p>
        {note && <p className="text-slate-600">{note}</p>}
      </div>
      <p className={`shrink-0 font-semibold tabular-nums ${struck ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{usd(payment.amount)}</p>
    </li>
  )
}

/** A seller's "I've paid": Found it on the row, after asking; a
 * different amount or Not found on the shop's Plan. */
function Waiting({ payment }: { payment: AdminPaymentRow }) {
  const { confirm, toast } = useFeedback()
  const check = useCheckClaim(payment.store_id)

  async function found() {
    const ok = await confirm({
      title: `Found ${payment.shop}'s payment?`,
      message: `${usd(payment.amount)} for a ${payment.period}, code ${payment.code}. It's marked paid.`,
      confirmLabel: 'Found it',
    })
    if (!ok) return
    check.mutate(
      { paymentId: payment.id, found: true, note: null },
      { onSuccess: (shop) => toast(`Marked paid · until ${shortDay(shop.paid_until ?? '')}`), onError: (error) => toast(errorText(error), 'error') },
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <Link to={`/admin/shops/${payment.store_id}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">
          {payment.shop}
        </Link>
        <span className="ml-2 text-xs font-semibold tracking-wide text-slate-500">{payment.code}</span>
        <p className="text-slate-500 tabular-nums">
          Says paid {usd(payment.amount)} · {payment.period} · {shortDay(payment.day)}
        </p>
      </div>
      <Button loading={check.isPending} onClick={found}>
        Found it
      </Button>
    </li>
  )
}
