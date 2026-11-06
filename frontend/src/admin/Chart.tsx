import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Card } from '../components/ui.tsx'

/** One column: `label` under the axis ("8 Oct", "Nov"), `long` in the
 * tooltip and the table ("Thu 8 Oct"). `partial`: today or this month, not
 * over yet. `none`: before Oak Order's first shop, so nothing could be
 * recorded (drawn as a band, not as zeros). */
export type ChartPoint = { key: string; label: string; long: string; value: number; partial?: boolean; none?: boolean; detail?: string }

type ChartProps = {
  /** What is counted, for screen readers and the table. */
  title: string
  points: ChartPoint[]
  /** A value in words: "3 orders", "$19.98". */
  unit: (n: number) => string
  money?: boolean
  /** Days (a label a week apart, "today") or months. */
  daily?: boolean
  height?: number
  /** When every value is 0. */
  empty?: string
}

/** A scale whose top and steps are round: counts in whole numbers and at
 * least 0–4 (so one sign-up is a short column, not a full one), money at
 * least $0–$10; 2 to 4 steps. */
function niceScale(max: number, money: boolean) {
  const target = money ? Math.max(max, 10) : Math.max(max, 4)
  for (let power = 0; power < 10; power++) {
    for (const base of money ? [1, 2, 2.5, 5] : [1, 2, 5]) {
      const step = base * 10 ** power
      if (Math.ceil(target / step) <= 4) return { top: Math.ceil(target / step) * step, step }
    }
  }
  return { top: target, step: target }
}

const dollars = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const cents = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Columns for counts and money over days or months (the founder's pick
 * 4A, 2026-11-06): one baseline at zero, round ticks with faint lines,
 * dates a week apart, today or this month dashed as "so far", a recorded
 * zero as a stub, the days before the first shop as a band. Values on
 * hover, on a tap, and with the arrow keys once the chart has focus; the
 * tooltip stays inside the chart. One series, so no legend: the card's
 * title names it. */
export function ColumnChart({ title, points, unit, money = false, daily = false, height = 180, empty = 'Nothing in these days' }: ChartProps) {
  const [ref, width] = useWidth()
  const tip = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const [said, setSaid] = useState('')
  const n = points.length
  const values = points.map((p) => (p.none ? 0 : p.value))
  const max = Math.max(0, ...values)
  const { top, step } = niceScale(max, money)
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const tickText = (t: number) => (money ? dollars(t) : String(t))
  const padLeft = Math.max(...ticks.map((t) => tickText(t).length)) * 6.6 + 10
  const padTop = 16
  const padBottom = 22
  const plotW = Math.max(0, width - padLeft - 4)
  const plotH = height - padTop - padBottom
  const band = n ? plotW / n : 0
  const barW = Math.max(2, Math.min(24, band - 2))
  const y = (v: number) => padTop + plotH - (v / top) * plotH
  const base = padTop + plotH
  const center = (i: number) => padLeft + (i + 0.5) * band
  let noneCount = 0
  while (noneCount < n && points[noneCount].none) noneCount++
  const nonZero = points.filter((p) => !p.none && p.value > 0).length
  const maxAt = values.indexOf(max)
  const labelAll = nonZero > 0 && nonZero <= 8
  const every = daily ? (band * 7 >= 46 ? 7 : 14) : Math.max(1, Math.ceil(46 / Math.max(band, 1)))
  const allZero = max === 0 && noneCount < n

  useLayoutEffect(() => {
    const el = tip.current
    if (!el || active === null) return
    const w = el.offsetWidth
    el.style.left = `${Math.max(0, Math.min(width - w, center(active) - w / 2))}px`
  })

  function pick(i: number, fromKeys = false) {
    const at = Math.max(0, Math.min(n - 1, i))
    setActive(at)
    if (fromKeys) {
      const p = points[at]
      setSaid(`${p.none ? 'No shops yet' : unit(p.value)}${p.partial ? ' so far' : ''}, ${p.long}`)
    }
  }
  function indexAt(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * width
    return Math.floor((x - padLeft) / band)
  }
  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    const at = active ?? n - 1
    const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: n - 1 }[event.key]
    if (to === undefined) return
    event.preventDefault()
    pick(to, true)
  }

  const shown = active === null ? null : points[active]
  const radius = (h: number) => Math.min(4, barW / 2, h)
  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          tabIndex={0}
          role="group"
          aria-label={`${title}. Arrow keys read each ${daily ? 'day' : 'month'}.`}
          onPointerMove={(e) => e.pointerType === 'mouse' && pick(indexAt(e))}
          onPointerDown={(e) => e.pointerType !== 'mouse' && pick(indexAt(e))}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          onKeyDown={onKey}
          onFocus={() => pick(active ?? n - 1, true)}
          onBlur={() => setActive(null)}
          className="block touch-pan-y overflow-visible rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-600"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={width - 4} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-slate-300' : 'stroke-slate-200'} strokeWidth={1} />
              <text x={padLeft - 7} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                {tickText(t)}
              </text>
            </g>
          ))}
          {noneCount > 0 && (
            <g>
              <rect x={padLeft} y={padTop} width={noneCount * band} height={plotH} rx={4} className="fill-slate-100" />
              {noneCount * band > 90 && (
                <text x={padLeft + (noneCount * band) / 2} y={padTop + plotH / 2 + 4} textAnchor="middle" className="fill-slate-500 text-[11px]">
                  No shops yet
                </text>
              )}
            </g>
          )}
          {points.map((p, i) => {
            if (p.none) return null
            const x = center(i) - barW / 2
            if (p.value <= 0) return <rect key={p.key} x={x} y={base - 2} width={barW} height={2} rx={1} className="fill-slate-300" />
            const top_ = y(p.value)
            const r = radius(base - top_)
            const d = `M${x} ${base}V${top_ + r}Q${x} ${top_} ${x + r} ${top_}H${x + barW - r}Q${x + barW} ${top_} ${x + barW} ${top_ + r}V${base}Z`
            const on = i === active
            return (
              <g key={p.key}>
                <path
                  d={d}
                  strokeWidth={p.partial ? 1.5 : 0}
                  strokeDasharray={p.partial ? '3 2' : undefined}
                  className={p.partial ? `stroke-navy-700 ${on ? 'fill-navy-100' : 'fill-surface'}` : on ? 'fill-navy-700' : 'fill-navy-300'}
                />
                {(labelAll || i === maxAt || (p.partial && nonZero > 8)) && (
                  <text x={center(i)} y={top_ - 5} textAnchor="middle" className="fill-slate-900 text-[11px] font-semibold tabular-nums">
                    {money ? (band > 54 ? cents(p.value) : dollars(p.value)) : p.value}
                  </text>
                )}
              </g>
            )
          })}
          {points.map((p, i) =>
            (n - 1 - i) % every === 0 ? (
              <text key={p.key} x={Math.min(width - 18, Math.max(padLeft + 12, center(i)))} y={height - 5} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {p.label}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {allZero && <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-slate-500">{empty}</p>}
      {shown && (
        <div
          ref={tip}
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 max-w-64 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-slate-50 shadow-lg"
        >
          <span className="font-semibold tabular-nums">{shown.none ? 'No shops yet' : unit(shown.value)}</span>
          <span className="ml-1.5 text-slate-50/70">{shown.long}</span>
          {shown.partial && !shown.none && <span className="block text-slate-50/80">{daily ? 'So far today' : 'This month so far'}</span>}
          {shown.detail && !shown.none && <span className="block text-slate-50/80">{shown.detail}</span>}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  )
}

/** Every value as a table, newest first: the chart's Table view. */
function ChartTable({ title, points, unit, daily }: ChartProps) {
  return (
    <div className="max-h-72 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500">
          <tr className="border-b border-slate-200">
            <th scope="col" className="py-1.5 text-left font-medium">
              {daily ? 'Day' : 'Month'}
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              {title}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...points].reverse().map((p) => (
            <tr key={p.key}>
              <th scope="row" className="py-1.5 text-left font-normal text-slate-700">
                {p.long}
                {p.detail && !p.none && <span className="block text-xs text-slate-500">{p.detail}</span>}
              </th>
              <td className="py-1.5 text-right text-slate-900 tabular-nums">{p.none ? <span className="text-slate-500">No shops yet</span> : `${unit(p.value)}${p.partial ? ' so far' : ''}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A chart in its card: the title, a summary at the right (a total, this
 * month's value), and Table to read every value as a table instead. */
export function ChartCard({ summary, heading = 'h2', className = '', ...chart }: ChartProps & { summary?: ReactNode; heading?: 'h2' | 'h3'; className?: string }) {
  const [table, setTable] = useState(false)
  const Heading = heading
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Heading className="min-w-0 flex-1 font-semibold text-slate-900">{chart.title}</Heading>
        {summary && <p className="text-sm text-slate-500 tabular-nums">{summary}</p>}
        <button
          type="button"
          aria-pressed={table}
          onClick={() => setTable(!table)}
          className="rounded text-sm font-semibold text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          {table ? 'Chart' : 'Table'}
        </button>
      </div>
      {table ? <ChartTable {...chart} /> : <ColumnChart {...chart} />}
    </Card>
  )
}
