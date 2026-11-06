import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from '../components/ui.tsx'
import { phnomPenhDate } from '../lib/orders.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { useListParams } from './listParams.ts'
import { LOG_KINDS, logItem, type DayItem } from './logWords.ts'
import { useAdminLog, useAdminShops } from './queries.ts'
import { addDays, dayMonth, ppDay, shortDay, time } from './shared.ts'

/** "2026-11-07T00:00:00+07:00": the start of the day after, in Phnom Penh. */
const dayAfter = (ymd: string) => `${addDays(ymd)}T00:00:00+07:00`

/** /admin/log: everything done from the admin, a day at a time (founder's
 * pick 13A, 2026-10-28), like a diary. Redesign pick 13A (2026-11-06): its
 * filters in one row above the days: the kind, any shop (every shop, not
 * only the few in the newest lines), a day to start from, and Clear; in
 * the address, so Back and a reload keep them. Read only: nothing here
 * changes a line. */
export function AdminLog() {
  const { params, update } = useListParams()
  const kind = LOG_KINDS.find((k) => k.label === params.get('kind'))?.label ?? null
  const storeId = params.get('shop')
  const day = params.get('from') ?? ''
  const [today] = useState(() => phnomPenhDate())
  const actions = LOG_KINDS.find((k) => k.label === kind)?.actions ?? []
  const shops = useAdminShops()
  const log = useAdminLog(storeId, actions, day ? dayAfter(day) : '')
  const filtered = storeId !== null || kind !== null || day !== ''
  const shopOptions = [...(shops.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <title>Log · Oak Order admin</title>
      <AdminPageHeader title="Log" subtitle="Everything done from the admin · Phnom Penh time" />
      <div className="max-w-4xl space-y-4">
        <div role="group" aria-label="Filter the log" className="flex flex-wrap items-end gap-3">
          <Field label="Kind" className="w-full sm:w-52">
            <Select value={kind ?? ''} onChange={(e) => update({ kind: e.target.value || null })}>
              <option value="">Everything</option>
              {LOG_KINDS.map((k) => (
                <option key={k.label} value={k.label}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Shop" className="w-full sm:w-64">
            <Select value={storeId ?? ''} onChange={(e) => update({ shop: e.target.value || null })}>
              <option value="">All shops</option>
              {shopOptions.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From day" className="w-full sm:w-44">
            <Input type="date" value={day} max={today} onChange={(e) => update({ from: e.target.value || null })} />
          </Field>
          {filtered && (
            <Button variant="ghost" onClick={() => update({ kind: null, shop: null, from: null })}>
              Clear
            </Button>
          )}
        </div>
        {log.isPending ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : log.error ? (
          <ErrorState error={log.error} onRetry={() => log.refetch()} />
        ) : log.data.pages[0].length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={filtered ? 'Nothing like this in the log' : 'Nothing done from the admin yet'}
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => update({ kind: null, shop: null, from: null })}>
                  Clear the filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DayList items={log.data.pages.flat().map((line) => logItem(line, storeId === null))} />
            {log.hasNextPage && (
              <Button variant="secondary" loading={log.isFetchingNextPage} onClick={() => log.fetchNextPage()}>
                Show older
              </Button>
            )}
          </>
        )}
      </div>
    </>
  )
}

/** A Phnom Penh day: "Today", "Yesterday", or "Mon 27 Oct" ("27 Oct 2025"
 * in another year). */
function dayTitle(key: string) {
  const today = phnomPenhDate()
  if (key === today) return 'Today'
  if (key === phnomPenhDate(-1)) return 'Yesterday'
  return key.slice(0, 4) === today.slice(0, 4) ? shortDay(key) : dayMonth(key, today.slice(0, 4))
}

/** Items under their Phnom Penh day, newest first: the log, and a shop's
 * Activity. */
export function DayList({ items }: { items: DayItem[] }) {
  const days = new Map<string, DayItem[]>()
  for (const item of items) {
    const key = ppDay(item.at)
    days.set(key, [...(days.get(key) ?? []), item])
  }
  return (
    <div className="space-y-5">
      {[...days].map(([key, dayItems]) => (
        <section key={key} aria-label={dayTitle(key)}>
          <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{dayTitle(key)}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {dayItems.map((item) => (
                <DayRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}

function DayRow({ item }: { item: DayItem }) {
  return (
    <li className="flex gap-3 px-4 py-3 text-sm">
      <span className="w-11 shrink-0 text-slate-500 tabular-nums">{time(item.at)}</span>
      <span className="min-w-0 flex-1">
        {item.href ? (
          <Link to={item.href} className="block font-medium text-slate-900 hover:underline">
            {item.title}
          </Link>
        ) : (
          <span className="block font-medium text-slate-900">{item.title}</span>
        )}
        {item.lines.map((text, i) => (
          <span key={i} className="block break-words text-slate-500">
            {text}
          </span>
        ))}
      </span>
      {item.warn && <span className="shrink-0 font-semibold text-amber-700">{item.warn}</span>}
    </li>
  )
}
