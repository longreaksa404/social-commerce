import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import type { AdminLogLine } from '../lib/types.ts'
import { logWords } from './logWords.ts'
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
            <LogDays lines={log.data.pages.flat()} withShop={storeId === null} />
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

/** Lines under their day, newest first; each shop's name links to it.
 * Also a shop's Activity (withShop false). */
export function LogDays({ lines, withShop = true }: { lines: AdminLogLine[]; withShop?: boolean }) {
  const days = new Map<string, AdminLogLine[]>()
  for (const line of lines) {
    const key = new Date(line.created_at).toDateString()
    days.set(key, [...(days.get(key) ?? []), line])
  }
  return (
    <div className="space-y-5">
      {[...days].map(([key, dayLines]) => (
        <section key={key} aria-label={dayTitle(key)}>
          <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{dayTitle(key)}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {dayLines.map((line) => (
                <LogRow key={line.id} line={line} withShop={withShop} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}

function LogRow({ line, withShop }: { line: AdminLogLine; withShop: boolean }) {
  const { title, lines } = logWords(line, withShop)
  const time = new Date(line.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <li className="flex gap-3 px-4 py-3 text-sm">
      <span className="w-11 shrink-0 text-slate-500 tabular-nums">{time}</span>
      <span className="min-w-0 flex-1">
        {withShop && line.store_id ? (
          <Link to={`/admin/shops/${line.store_id}`} className="block font-medium text-slate-900 hover:underline">
            {title}
          </Link>
        ) : (
          <span className="block font-medium text-slate-900">{title}</span>
        )}
        {lines.map((text, i) => (
          <span key={i} className="block break-words text-slate-500">
            {text}
          </span>
        ))}
      </span>
    </li>
  )
}
