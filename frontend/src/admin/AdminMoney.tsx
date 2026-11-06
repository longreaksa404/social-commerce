import { ChevronLeft, ChevronRight, Download, Wallet } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorMessage, ErrorState, Field, IconButton, Skeleton, TextArea } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { adminBlob } from '../lib/api.ts'
import { errorText } from '../lib/errors.ts'
import { formatMoney } from '../lib/money.ts'
import { phnomPenhDate } from '../lib/orders.ts'
import type { AdminPaymentRow, AdminPayments } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { Tile } from './AdminHome.tsx'
import { useListParams } from './listParams.ts'
import { useAdminPayments, useCheckClaim } from './queries.ts'
import { monthName, shortDay } from './shared.ts'
import { Chip, Chips, Sheet } from './ui.tsx'

const usd = (amount: string | number) => formatMoney(amount, 'USD')
const monthOf = (year: number, month: number) => monthName(`${year}-${String(month).padStart(2, '0')}`)
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

const STATUSES = [
  ['all', 'All'],
  ['paid', 'Paid'],
  ['failed', 'Not found'],
  ['void', 'Undone'],
] as const
type Status = (typeof STATUSES)[number][0]
const STATUS_WORD: Record<AdminPaymentRow['status'], string> = { paid: 'Paid', failed: 'Not found', void: 'Undone', pending: 'Waiting' }

/** /admin/money (part 17; redesign pick 8A, 2026-11-06): called Money, as
 * in the menu. Every "I've paid" waiting comes first, with Found it, Not
 * found and Open plan on its row; then a month's or a year's payments in
 * one table, the same columns as the Excel file, filtered by what
 * happened, with what was collected in it and its year. The month and
 * the filter are in the address, so coming back from a shop keeps them. */
export function AdminMoney() {
  const [today] = useState(() => phnomPenhDate())
  const { params, update } = useListParams()
  const thisYear = Number(today.slice(0, 4))
  const thisMonth = Number(today.slice(5, 7))
  const year = Number(params.get('year')) || thisYear
  const monthParam = params.get('month')
  const month: number | null = monthParam === 'all' ? null : Number(monthParam) || (params.get('year') ? null : thisMonth)
  const status: Status = STATUSES.find(([key]) => key === params.get('status'))?.[0] ?? 'all'
  const payments = useAdminPayments(year, month)
  const { toast } = useFeedback()

  function show(nextYear: number, nextMonth: number | null) {
    update({ year: String(nextYear), month: nextMonth === null ? 'all' : String(nextMonth) })
  }
  function step(by: number) {
    if (month === null) return show(year + by, null)
    const index = year * 12 + month - 1 + by
    show(Math.floor(index / 12), (index % 12) + 1)
  }
  const label = month === null ? String(year) : monthOf(year, month)
  const atNow = month === null ? year >= thisYear : year * 12 + month >= thisYear * 12 + thisMonth

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
      <title>Money · Oak Order admin</title>
      <AdminPageHeader
        title="Money"
        subtitle="Plan payments to Oak Order"
        action={
          <Button variant="secondary" loading={download.isPending} onClick={() => download.mutate()}>
            <Download aria-hidden className="size-4" />
            Excel
          </Button>
        }
      />
      {payments.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : payments.error ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : (
        <div className="space-y-6">
          <Waiting data={payments.data} />
          <section aria-label={`Payments in ${label}`} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Show" className="flex rounded-xl bg-slate-100 p-0.5">
                {(['month', 'year'] as const).map((option) => {
                  const on = option === 'year' ? month === null : month !== null
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={on}
                      onClick={() => show(year, option === 'year' ? null : (month ?? (year === thisYear ? thisMonth : 12)))}
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
            <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
              <Tile label={`Collected in ${label}`} value={usd(payments.data.collected)}>
                {plural(payments.data.paid, 'payment')}
              </Tile>
              {payments.data.month !== null && (
                <Tile label={String(payments.data.year)} value={usd(payments.data.collected_year)}>
                  the whole year
                </Tile>
              )}
            </div>
            <Payments data={payments.data} label={label} status={status} onStatus={(next) => update({ status: next === 'all' ? null : next })} />
          </section>
        </div>
      )}
    </>
  )
}

function Waiting({ data }: { data: AdminPayments }) {
  if (data.waiting.length === 0) return null
  return (
    <section aria-labelledby="waiting">
      <h2 id="waiting" className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">
        Waiting · {data.waiting.length}
      </h2>
      <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden`}>
        {data.waiting.map((p) => (
          <WaitingRow key={p.id} payment={p} />
        ))}
      </ul>
    </section>
  )
}

/** A seller's "I've paid": Found it (asks first), Not found (with a note
 * the seller sees), or Open plan for a different amount or the history. */
function WaitingRow({ payment }: { payment: AdminPaymentRow }) {
  const { confirm, toast } = useFeedback()
  const check = useCheckClaim(payment.store_id)
  const [rejecting, setRejecting] = useState(false)
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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 text-sm">
      <div className="min-w-48 flex-1">
        <p className="font-medium break-words text-slate-900">
          {payment.shop} <span className="ml-1 text-xs font-semibold tracking-wide text-slate-500">{payment.code}</span>
        </p>
        <p className="font-medium text-navy-700 tabular-nums">
          Says paid {usd(payment.amount)} for a {payment.period} · {shortDay(payment.day)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button loading={check.isPending} onClick={found}>
          Found it
        </Button>
        <Button variant="secondary" disabled={check.isPending} onClick={() => setRejecting(true)}>
          Not found
        </Button>
        <Link to={`/admin/shops/${payment.store_id}?tab=plan`} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold text-navy-700 hover:underline sm:min-h-10">
          Open plan
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <NotFound payment={payment} open={rejecting} onClose={() => setRejecting(false)} />
    </li>
  )
}

/** Not found: the seller sees the note and can say "I've paid" again. */
function NotFound({ payment, open, onClose }: { payment: AdminPaymentRow; open: boolean; onClose: () => void }) {
  const a = useT().admin
  const { toast } = useFeedback()
  const check = useCheckClaim(payment.store_id)
  const [note, setNote] = useState('')
  function close() {
    setNote('')
    check.reset()
    onClose()
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    check.mutate(
      { paymentId: payment.id, found: false, note: note.trim() || a.notFoundDefault },
      {
        onSuccess: () => {
          toast(a.checked)
          close()
        },
      },
    )
  }
  return (
    <Sheet open={open} onClose={close} title={`Not found: ${payment.shop}?`}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-6 text-slate-600">The seller sees your note and can say they paid again.</p>
        <Field label="Note to the seller" className="mt-4">
          <TextArea rows={2} maxLength={200} placeholder={a.notFoundDefault} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorMessage error={check.error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={check.isPending}>
            Not found
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

const forWhat = (p: AdminPaymentRow) => `${Number(p.amount) === 0 ? 'Free ' : ''}${p.period === 'month' ? 'Month' : 'Year'}`
const covers = (p: AdminPaymentRow) => (p.covers_from && p.covers_until && p.status === 'paid' ? `${shortDay(p.covers_from)} – ${shortDay(p.covers_until)}` : '')
const note = (p: AdminPaymentRow) => (p.status === 'paid' ? p.reference : p.failure)

/** The month's or year's payments: a table on a laptop, the same columns
 * as the Excel file; rows on a phone. Filtered by what happened. */
function Payments({ data, label, status, onStatus }: { data: AdminPayments; label: string; status: Status; onStatus: (s: Status) => void }) {
  const count = (s: Status) => (s === 'all' ? data.payments.length : data.payments.filter((p) => p.status === s).length)
  const shown = status === 'all' ? data.payments : data.payments.filter((p) => p.status === status)
  if (data.payments.length === 0) return <EmptyState icon={Wallet} title={`No payments in ${label}`} />
  return (
    <div className="space-y-3">
      <Chips label="Show">
        {STATUSES.map(([key, word]) => (
          <Chip key={key} on={status === key} onClick={() => onStatus(key)}>
            {word}
            <span className={`ml-1.5 tabular-nums ${status === key ? 'text-white/80' : 'text-slate-500'}`}>{count(key)}</span>
          </Chip>
        ))}
      </Chips>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">None in {label}</p>
      ) : (
        <>
          <div className={`${cardClass} hidden overflow-x-auto lg:block`}>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  {['Day', 'Shop', 'Code', 'For', 'Amount', 'Status', 'Covers', 'Note'].map((h) => (
                    <th key={h} scope="col" className={`px-4 py-2.5 font-medium whitespace-nowrap ${h === 'Amount' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((p) => (
                  <tr key={p.id} className="relative transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{shortDay(p.day)}</td>
                    <td className="min-w-44 px-4 py-2.5">
                      <Link
                        to={`/admin/shops/${p.store_id}?tab=plan`}
                        className="line-clamp-2 font-medium break-words text-slate-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
                      >
                        {p.shop}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500">{p.code}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{forWhat(p)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums ${p.status === 'void' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {usd(p.amount)}
                    </td>
                    <td className={`px-4 py-2.5 whitespace-nowrap ${p.status === 'paid' ? 'text-emerald-700' : 'text-slate-500'}`}>{STATUS_WORD[p.status]}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{covers(p) || '—'}</td>
                    <td className="max-w-64 px-4 py-2.5 break-words text-slate-500">{note(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={`${cardClass} divide-y divide-slate-100 overflow-hidden lg:hidden`}>
            {shown.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/shops/${p.store_id}?tab=plan`} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words text-slate-900">{p.shop}</span>
                    <span className="block text-slate-500 tabular-nums">
                      {shortDay(p.day)} · {forWhat(p).toLowerCase()} · <span className={p.status === 'paid' ? 'text-emerald-700' : ''}>{STATUS_WORD[p.status]}</span>
                      {covers(p) && ` · ${covers(p)}`}
                    </span>
                    {note(p) && <span className="block break-words text-slate-600">{note(p)}</span>}
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${p.status === 'void' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{usd(p.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
