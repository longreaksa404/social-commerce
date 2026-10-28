import { useState } from 'react'
import { Card } from '../components/ui.tsx'
import { shortDay } from './shared.ts'

/** One number per day for the last 30 days, as columns (one series, so no
 * legend: the title names it). Thin navy columns with rounded tops on one
 * baseline, 2px apart; today's at full strength and labelled. Hovering or
 * focusing a column shows its day and value; a hidden table gives every
 * value to screen readers. */
export function DailyBars({
  title,
  days,
  unit,
}: {
  title: string
  days: { day: string; value: number }[]
  unit: (n: number) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...days.map((d) => d.value))
  const last = days.at(-1)
  const shown = active === null ? null : days[active]
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">30 days</p>
      </div>
      <div className="relative mt-4" onMouseLeave={() => setActive(null)}>
        <span className="absolute -top-1 left-0 text-xs text-slate-400 tabular-nums">{max}</span>
        <div aria-hidden className="flex h-28 items-end gap-[2px] border-b border-slate-200 pt-4">
          {days.map((d, i) => (
            <div
              key={d.day}
              onMouseEnter={() => setActive(i)}
              className="flex h-full flex-1 items-end justify-center"
            >
              <div
                className={`w-full max-w-6 rounded-t-[4px] ${i === days.length - 1 || i === active ? 'bg-navy-700' : 'bg-navy-300'}`}
                style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : 0 }}
              />
            </div>
          ))}
        </div>
        {shown && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
          >
            <span className="font-semibold tabular-nums">{unit(shown.value)}</span>
            <span className="ml-1.5 text-white/70">{shortDay(shown.day)}</span>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>{days[0] && shortDay(days[0].day)}</span>
        {last && (
          <span>
            Today <span className="font-semibold text-slate-900 tabular-nums">{last.value}</span>
          </span>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}, last 30 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{shortDay(d.day)}</th>
              <td>{unit(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
