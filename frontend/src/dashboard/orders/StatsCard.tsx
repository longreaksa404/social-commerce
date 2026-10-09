import { useState } from 'react'
import { Card, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatCalendarDay } from '../../lib/orders.ts'
import type { Amount, StatsPeriod } from '../../lib/types.ts'
import { useStats } from '../queries.ts'

const PERIODS: StatsPeriod[] = ['today', 'week', 'month']

/** The shop's numbers at the top of the Orders tab, for the owner
 * (founder's picks 8B, 9B, 2026-10-09): orders, sales and what's not paid
 * yet for today, the last 7 days or this month, and a bar per day. Tap a
 * bar for its day. One series: the chosen day (else today) in deep navy,
 * the others a lighter navy, both 3:1 or more on the card in light and
 * dark. */
export function StatsCard() {
  const t = useT()
  const s = t.orders.stats
  const [period, setPeriod] = useState<StatsPeriod>('today')
  const [picked, setPicked] = useState<string | null>(null)
  const stats = useStats(period)
  const money = (amounts: Amount[]) => amounts.map((a) => formatMoney(a.amount, a.currency)).join(' · ')

  if (stats.isPending) return <Skeleton className="mb-4 h-44 w-full rounded-2xl" />
  if (!stats.data) return null
  const { data } = stats
  const max = Math.max(...data.days.map((d) => Number(d.sales)), 0)
  const today = data.days[data.days.length - 1]?.date
  const shown = data.days.find((d) => d.date === picked) ?? null
  const strong = picked ?? today

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-500">{s.label}</h2>
        <div role="radiogroup" aria-label={s.label} className="flex rounded-full bg-slate-100 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => {
                setPeriod(p)
                setPicked(null)
              }}
              className={`min-h-9 rounded-full px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                period === p ? 'bg-surface text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {data.sales.length > 0 ? money(data.sales) : formatMoney(0, data.currency)}
        </p>
        <p className="text-sm text-slate-600">{s.orders(data.orders)}</p>
        {data.orders > 0 && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
              data.to_collect.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {data.to_collect.length > 0 ? s.toCollect(money(data.to_collect)) : s.allPaid}
          </span>
        )}
      </div>

      {/* The bars. Each day is a button as tall as the chart, so the
          target is bigger than the bar; it reads its day out loud. */}
      <div className="mt-4" aria-label={s.chart} role="group">
        <p className="mb-1 min-h-5 text-sm text-slate-700 tabular-nums" aria-live="polite">
          {shown && s.day(formatCalendarDay(shown.date), s.orders(shown.orders), formatMoney(shown.sales, data.currency))}
        </p>
        <div className="flex h-16 items-end gap-0.5 border-b border-slate-200">
          {data.days.map((day) => {
            const sales = Number(day.sales)
            const height = max > 0 ? Math.max((sales / max) * 100, sales > 0 ? 6 : 0) : 0
            return (
              <button
                key={day.date}
                type="button"
                aria-pressed={picked === day.date}
                aria-label={s.day(formatCalendarDay(day.date), s.orders(day.orders), formatMoney(day.sales, data.currency))}
                onClick={() => setPicked(picked === day.date ? null : day.date)}
                className="flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-navy-600"
              >
                <span
                  className={`block w-full max-w-6 rounded-t ${day.date === strong ? 'bg-navy-700' : 'bg-navy-400'}`}
                  style={{ height: `${height}%` }}
                />
              </button>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500 tabular-nums">
          <span>{data.days[0] && formatCalendarDay(data.days[0].date)}</span>
          <span>{t.orders.stats.today}</span>
        </div>
      </div>
    </Card>
  )
}
