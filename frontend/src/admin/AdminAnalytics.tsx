import { useSearchParams } from 'react-router'
import { Card, ErrorState, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import type { AdminAnalytics as Analytics, AdminMonth } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { Tile } from './AdminHome.tsx'
import { ColumnChart, type ChartPoint } from './Chart.tsx'
import { useAdminAnalytics, useFirstSignupDay } from './queries.ts'
import { day, monthName } from './shared.ts'
import { Chip, Chips } from './ui.tsx'

const RANGES = [6, 12, 24] as const
const usd = (amount: string | number) => formatMoney(amount, 'USD')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const percent = (part: number, whole: number) => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`)

/** "Nov", or "Jan 26" where a year starts. */
const monthShort = (ym: string, withYear = false) => monthName(ym, withYear || ym.endsWith('-01') ? 'shortYear' : 'short')

type Measure = {
  key: string
  title: string
  money: boolean
  value: (m: AdminMonth) => number
  unit: (n: number) => string
  detail?: (m: AdminMonth) => string
}

// The six measures, as before, in two groups (founder's pick 5A,
// 2026-11-06): Oak Order's own money and shops, and the shops' orders,
// which are counted, never added up as Oak Order's money.
const MONEY: Measure[] = [
  {
    key: 'collected',
    title: 'Collected',
    money: true,
    value: (m) => Number(m.collected),
    unit: usd,
    detail: (m) => `Monthly plans ${usd(m.collected_month_plans)} · yearly ${usd(m.collected_year_plans)} · ${plural(m.payments, 'payment')}`,
  },
  {
    key: 'value',
    title: 'Monthly value',
    money: true,
    value: (m) => Number(m.monthly_value),
    unit: usd,
    detail: (m) => `${plural(m.paying, 'paying shop')} on the month's last day`,
  },
  { key: 'paying', title: 'Paying shops', money: false, value: (m) => m.paying, unit: (n) => plural(n, 'shop') },
  { key: 'new', title: 'New shops', money: false, value: (m) => m.signups, unit: (n) => plural(n, 'sign-up') },
]
const ORDERS: Measure[] = [
  { key: 'orders', title: 'Orders in all shops', money: false, value: (m) => m.orders, unit: (n) => plural(n, 'order') },
  { key: 'active', title: 'Shops with orders', money: false, value: (m) => m.active_shops, unit: (n) => plural(n, 'shop') },
]
const MEASURES = [...MONEY, ...ORDERS]

/** /admin/analytics: how Oak Order grows, month by month, from what is
 * already recorded (shops, orders, plan payments); test shops left out.
 * Founder's pick 5A (2026-11-06): the five numbers, then one big chart
 * whose measure is picked from two groups, then every number in a month
 * table to check against. The range and the measure are in the address,
 * so Back and a reload keep them. */
export function AdminAnalytics() {
  const [params, setParams] = useSearchParams()
  const months = RANGES.find((n) => String(n) === params.get('months')) ?? 12
  const measure = MEASURES.find((m) => m.key === params.get('measure')) ?? MEASURES[0]
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }
  const analytics = useAdminAnalytics(months)
  const data = analytics.data
  return (
    <>
      <title>Analytics · Oak Order admin</title>
      <AdminPageHeader
        title="Analytics"
        subtitle={
          data ? `Phnom Penh months, to ${day(data.through)}${data.test_shops ? ` · ${plural(data.test_shops, 'test shop')} left out` : ''}` : undefined
        }
      />
      <div className="space-y-5">
        <Chips label="Range">
          {RANGES.map((n) => (
            <Chip key={n} on={months === n} onClick={() => set('months', String(n))}>
              {n} months
            </Chip>
          ))}
        </Chips>
        {analytics.isPending ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        ) : analytics.error ? (
          <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
        ) : (
          <Page data={analytics.data} measure={measure} onMeasure={(key) => set('measure', key)} />
        )}
      </div>
    </>
  )
}

function Page({ data, measure, onMeasure }: { data: Analytics; measure: Measure; onMeasure: (key: string) => void }) {
  const first = useFirstSignupDay()
  const firstMonth = first?.slice(0, 7) ?? null
  const months = data.months
  const last = months.length - 1
  const points: ChartPoint[] = months.map((m, i) => ({
    key: m.month,
    label: monthShort(m.month, i === 0),
    long: monthName(m.month),
    value: measure.value(m),
    partial: i === last,
    none: firstMonth !== null && m.month < firstMonth,
    detail: measure.detail?.(m),
  }))
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

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:gap-x-6">
          <MeasureGroup label="Oak Order's money" measures={MONEY} on={measure} onPick={onMeasure} />
          <MeasureGroup label="The shops' orders" measures={ORDERS} on={measure} onPick={onMeasure} />
        </div>
        <div className="mt-4 mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="min-w-0 flex-1 font-semibold text-slate-900">{measure.title}</h2>
          <p className="text-sm text-slate-500 tabular-nums">
            This month so far <span className="font-semibold text-slate-900">{measure.unit(points[last]?.value ?? 0)}</span>
          </p>
        </div>
        <ColumnChart title={measure.title} points={points} unit={measure.unit} money={measure.money} height={260} empty="None in these months" />
      </Card>

      <MonthTable months={months} firstMonth={firstMonth} />
      <Definitions />
    </>
  )
}

function MeasureGroup({ label, measures, on, onPick }: { label: string; measures: Measure[]; on: Measure; onPick: (key: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {measures.map((m) => (
          <Chip key={m.key} on={m.key === on.key} onClick={() => onPick(m.key)}>
            {m.title}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/** Every measure for every month, newest first: the numbers behind the
 * chart, to check against. Months before the first shop are one line. */
function MonthTable({ months, firstMonth }: { months: AdminMonth[]; firstMonth: string | null }) {
  const shown = [...months].reverse().filter((m) => firstMonth === null || m.month >= firstMonth)
  const before = firstMonth !== null && months.some((m) => m.month < firstMonth)
  const last = months.at(-1)?.month
  return (
    <section aria-labelledby="months">
      <h2 id="months" className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">
        By month
      </h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Month
              </th>
              {['Collected', 'Monthly value', 'Paying shops', 'New shops', 'Orders', 'Shops with orders'].map((h) => (
                <th key={h} scope="col" className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {shown.map((m) => (
              <tr key={m.month}>
                <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap text-slate-900">
                  {monthName(m.month)}
                  {m.month === last && <span className="ml-1.5 text-xs font-normal text-slate-500">so far</span>}
                </th>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-900">
                  {usd(m.collected)}
                  {m.payments > 0 && <span className="block text-xs text-slate-500">{plural(m.payments, 'payment')}</span>}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-900">{usd(m.monthly_value)}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{m.paying}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{m.signups}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{m.orders.toLocaleString('en-US')}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{m.active_shops}</td>
              </tr>
            ))}
            {before && firstMonth && (
              <tr>
                <td colSpan={7} className="px-4 py-2.5 text-slate-500">
                  Before {monthName(firstMonth)}: no shops yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

/** What each number means, folded away: the page counts only what is
 * recorded, so a number the records can't answer isn't shown. */
function Definitions() {
  return (
    <details className="group rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-slate-200 sm:px-5">
      <summary className="cursor-pointer font-medium text-slate-700 marker:text-slate-400">How these are counted</summary>
      <dl className="mt-3 max-w-prose space-y-3 text-slate-600">
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
        <div>
          <dt className="font-medium text-slate-900">No shops yet</dt>
          <dd>Months before the first shop signed up (test shops left out), when nothing could be recorded.</dd>
        </div>
      </dl>
    </details>
  )
}
