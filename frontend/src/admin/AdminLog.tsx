import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Field, Input, Skeleton } from '../components/ui.tsx'
import { AdminPageHeader } from './AdminHeader.tsx'
import { phnomPenhDate } from '../lib/orders.ts'
import { LOG_KINDS, logItem, type DayItem } from './logWords.ts'
import { useAdminLog } from './queries.ts'
import { addDays, dayMonth, ppDay, shortDay, time } from './shared.ts'
import { Chip, Chips } from './ui.tsx'

// Chips for the shops in the newest lines, after All shops.
const SHOP_CHIPS = 5

/** "2026-11-07T00:00:00+07:00": the start of the day after, in Phnom Penh. */
const dayAfter = (ymd: string) => `${addDays(ymd)}T00:00:00+07:00`

/** /admin/log: everything done from the admin, a day at a time (founder's
 * pick 13A, 2026-10-28), like a diary; chips for the kinds of action and
 * the shops in it, and a day to start from. Read only: nothing here
 * changes a line. */
export function AdminLog() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [kind, setKind] = useState<string | null>(null)
  const [day, setDay] = useState('')
  const [today] = useState(() => phnomPenhDate())
  const actions = LOG_KINDS.find((k) => k.label === kind)?.actions ?? []
  const all = useAdminLog(null)
  const log = useAdminLog(storeId, actions, day ? dayAfter(day) : '')
  const filtered = storeId !== null || kind !== null || day !== ''
  const shops = new Map<string, string>()
  for (const line of all.data?.pages.flat() ?? []) {
    if (line.store_id && line.shop && shops.size < SHOP_CHIPS) shops.set(line.store_id, line.shop)
  }

  return (
    <>
      <title>Log · Oak Order admin</title>
      <AdminPageHeader title="Log" />
      <div className="max-w-3xl space-y-4">
        <Chips label="Kind">
          <Chip on={kind === null} onClick={() => setKind(null)}>
            Everything
          </Chip>
          {LOG_KINDS.map((k) => (
            <Chip key={k.label} on={kind === k.label} onClick={() => setKind(k.label)}>
              {k.label}
            </Chip>
          ))}
        </Chips>
        {shops.size > 0 && (
          <Chips label="Shop">
            <Chip on={storeId === null} onClick={() => setStoreId(null)}>
              All shops
            </Chip>
            {[...shops].map(([id, name]) => (
              <Chip key={id} on={storeId === id} onClick={() => setStoreId(id)}>
                {name}
              </Chip>
            ))}
          </Chips>
        )}
        <div className="flex items-end gap-2">
          <Field label="From day" className="w-48">
            <Input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
          </Field>
          {day && (
            <Button variant="secondary" onClick={() => setDay('')}>
              Today
            </Button>
          )}
        </div>
        {log.isPending ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : log.error ? (
          <ErrorState error={log.error} onRetry={() => log.refetch()} />
        ) : log.data.pages[0].length === 0 ? (
          <EmptyState icon={ScrollText} title={filtered ? 'Nothing like this in the log' : 'Nothing done from the admin yet'} />
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
