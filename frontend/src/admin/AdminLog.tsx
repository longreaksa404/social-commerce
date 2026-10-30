import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import { logItem, type DayItem } from './logWords.ts'
import { useAdminLog } from './queries.ts'
import { Chip, Chips } from './ui.tsx'

// Chips for the shops in the newest lines, after All shops.
const SHOP_CHIPS = 5

/** /admin/log: everything done from the admin, a day at a time (founder's
 * pick 13A, 2026-10-28), like a diary; chips for the shops in it. */
export function AdminLog() {
  const [storeId, setStoreId] = useState<string | null>(null)
  const all = useAdminLog(null)
  const log = useAdminLog(storeId)
  const shops = new Map<string, string>()
  for (const line of all.data?.pages.flat() ?? []) {
    if (line.store_id && line.shop && shops.size < SHOP_CHIPS) shops.set(line.store_id, line.shop)
  }

  return (
    <>
      <title>Log · Oak Order admin</title>
      <PageHeader title="Log" />
      <div className="max-w-3xl space-y-4">
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
        {log.isPending ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : log.error ? (
          <ErrorState error={log.error} onRetry={() => log.refetch()} />
        ) : log.data.pages[0].length === 0 ? (
          <EmptyState icon={ScrollText} title="Nothing done from the admin yet" />
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

/** "Today", "Yesterday", or "Mon 27 Oct". */
function dayTitle(key: string) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (key === today.toDateString()) return 'Today'
  if (key === yesterday.toDateString()) return 'Yesterday'
  const day = new Date(key)
  return day.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

/** Items under their day, newest first: the log, and a shop's Activity. */
export function DayList({ items }: { items: DayItem[] }) {
  const days = new Map<string, DayItem[]>()
  for (const item of items) {
    const key = new Date(item.at).toDateString()
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
  const time = new Date(item.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <li className="flex gap-3 px-4 py-3 text-sm">
      <span className="w-11 shrink-0 text-slate-500 tabular-nums">{time}</span>
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
