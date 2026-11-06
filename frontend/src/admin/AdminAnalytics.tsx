import { useState } from 'react'
import { Card, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import type { AdminAnalytics as Analytics, AdminMonth } from '../lib/types.ts'
import { Tile } from './AdminHome.tsx'
import { useAdminAnalytics } from './queries.ts'
import { day, monthName } from './shared.ts'
import { Chip, Chips } from './ui.tsx'

const RANGES = [6, 12, 24] as const
const usd = (amount: string | number) => formatMoney(amount, 'USD')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const percent = (part: number, whole: number) => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`)

/** "Nov", or "Jan 26" where a year starts. */
const monthShort = (ym: string, withYear = false) => monthName(ym, withYear || ym.endsWith('-01') ? 'shortYear' : 'short')
const monthLong = (ym: string) => monthName(ym)

/** /admin/analytics: how Oak Order grows, month by month, from what is
 * already recorded (shops, orders, plan payments); test shops left out.
 * Oak Order's money is plan payments only; the shops' orders are counted,
 * never added up as money here. One measure per chart, one axis each. */
export function AdminAnalytics() {
  const [months, setMonths] = useState<number>(12)
  const analytics = useAdminAnalytics(months)
  const data = analytics.data
  return (
    <>
      <title>Analytics · Oak Order admin</title>
      <PageHeader
        title="Analytics"
        subtitle={
          data ? `Phnom Penh months, to ${day(data.through)}${data.test_shops ? ` · ${plural(data.test_shops, 'test shop')} left out` : ''}` : undefined
        }
      />
      <div className="space-y-6">
        <Chips label="Range">
          {RANGES.map((n) => (
            <Chip key={n} on={months === n} onClick={() => setMonths(n)}>
              {n} months
            </Chip>
          ))}
        </Chips>
        {analytics.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : analytics.error ? (
          <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
        ) : (
          <Page data={analytics.data} />
        )}
      </div>
    </>
  )
}

function Page({ data }: { data: Analytics }) {
  const m = data.months
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Paying now" value={data.paying_month + data.paying_year}>
          {data.paying_month} monthly · {data.paying_year} yearly
        </Tile>
        <Tile label="Monthly value now" value={usd(data.monthly_value)}>
          a year's price / 12
        </Tile>
        <Tile label="Trial to paid" value={percent(data.converted, data.trial_over)}>
          {data.trial_over === 0 ? 'No trial has ended yet' : `${data.converted} of ${plural(data.trial_over, 'shop')}`}
        </Tile>
        <Tile label="Renewed" value={percent(data.renewed, data.renewals_due)}>
          {data.renewals_due === 0 ? 'No paid time ended yet' : `${data.renewed} of ${plural(data.renewals_due, 'paid period')}`}
        </Tile>
        <div className="col-span-2 lg:col-span-1">
          <Tile label="Quiet shops" value={data.quiet_shops}>
            of {plural(data.open_shops, 'open shop')}: no order in 30 days
          </Tile>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-500 sm:px-1">Oak Order's money</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyBars
          title="Collected"
          months={m}
          value={(x) => Number(x.collected)}
          label={(n) => usd(n)}
          detail={(x) => `Monthly plans ${usd(x.collected_month_plans)} · yearly ${usd(x.collected_year_plans)} · ${plural(x.payments, 'payment')}`}
        />
        <MonthlyBars
          title="Monthly value"
          months={m}
          value={(x) => Number(x.monthly_value)}
          label={(n) => usd(n)}
          detail={(x) => `${plural(x.paying, 'paying shop')} on the month's last day`}
        />
        <MonthlyBars title="Paying shops" months={m} value={(x) => x.paying} label={(n) => plural(n, 'shop')} />
        <MonthlyBars title="New shops" months={m} value={(x) => x.signups} label={(n) => plural(n, 'sign-up')} />
      </div>

      <h2 className="text-sm font-semibold text-slate-500 sm:px-1">The shops' orders</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyBars title="Orders in all shops" months={m} value={(x) => x.orders} label={(n) => plural(n, 'order')} />
        <MonthlyBars title="Shops with orders" months={m} value={(x) => x.active_shops} label={(n) => plural(n, 'shop')} />
      </div>

      <Definitions />
    </>
  )
}

/** One measure per month as columns, like Home's DailyBars: navy columns
 * with rounded tops on one baseline, the newest month full strength and
 * labelled; hovering a column shows its month, value and detail; a hidden
 * table gives every value to screen readers. */
function MonthlyBars({
  title,
  months,
  value,
  label,
  detail,
}: {
  title: string
  months: AdminMonth[]
  value: (month: AdminMonth) => number
  label: (n: number) => string
  detail?: (month: AdminMonth) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  const values = months.map(value)
  const max = Math.max(...values, 0)
  const last = months.length - 1
  const shown = active === null ? null : months[active]
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">
          This month <span className="font-semibold text-slate-900 tabular-nums">{label(values[last] ?? 0)}</span>
        </p>
      </div>
      {max === 0 ? (
        <p className="mt-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
          None in these months
        </p>
      ) : (
        <div className="relative mt-4" onMouseLeave={() => setActive(null)}>
          <span className="absolute -top-1 left-0 text-xs text-slate-400 tabular-nums">{label(max)}</span>
          <div aria-hidden className="flex h-28 items-end gap-[2px] border-b border-slate-200 pt-4">
            {values.map((v, i) => (
              <div key={months[i].month} onMouseEnter={() => setActive(i)} className="flex h-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-8 rounded-t-[4px] ${i === last || i === active ? 'bg-navy-700' : 'bg-navy-300'}`}
                  style={{ height: v ? `${Math.max(3, (v / max) * 100)}%` : 0 }}
                />
              </div>
            ))}
          </div>
          {shown && active !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 max-w-64 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
              style={
                active < months.length / 2
                  ? { left: `${(active / months.length) * 100}%` }
                  : {
                      right: `${((months.length - active - 1) / months.length) * 100}%`,
                    }
              }
            >
              <span className="font-semibold tabular-nums">{label(values[active])}</span>
              <span className="ml-1.5 text-white/70">{monthLong(shown.month)}</span>
              {detail && <span className="mt-0.5 block text-white/80">{detail(shown)}</span>}
            </div>
          )}
        </div>
      )}
      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>{months[0] && monthShort(months[0].month, true)}</span>
        <span>{months[last] && monthShort(months[last].month, true)}</span>
      </div>
      {/* In a hidden box: a table ignores a 1px width and would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>{title}, by month</caption>
          <tbody>
            {months.map((month, i) => (
              <tr key={month.month}>
                <th scope="row">{monthLong(month.month)}</th>
                <td>{label(values[i])}</td>
                {detail && <td>{detail(month)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** What each number means, folded away: the page counts only what is
 * recorded, so a number the records can't answer isn't shown. */
function Definitions() {
  return (
    <details className="group rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-slate-200 sm:px-5">
      <summary className="cursor-pointer font-medium text-slate-700 marker:text-slate-400">How these are counted</summary>
      <dl className="mt-3 space-y-3 text-slate-600">
        <div>
          <dt className="font-medium text-slate-900">Collected</dt>
          <dd>Plan payments marked paid in the month, more than $0. Undone and not found aren't counted.</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Paying shops, monthly value</dt>
          <dd>
            On the month's last day (today for this month): shops that had paid for a period not over yet, a year's price counted as a twelfth a month. Free
            time ($0) isn't paying. Home's "If all renew" also counts shops in their 7 days to pay.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Trial to paid</dt>
          <dd>Of the shops whose free time has ended, or that paid, the ones that paid at least once.</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Renewed</dt>
          <dd>Of the paid periods that ended in these months more than 7 days ago, the ones followed by another payment.</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Orders, shops with orders</dt>
          <dd>Orders placed in every shop, counted, never added up as Oak Order's money. Quiet: open shops past setup with no order in 30 days.</dd>
        </div>
      </dl>
    </details>
  )
}
