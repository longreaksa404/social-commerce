import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { AdminShop } from '../../lib/types.ts'
import { useAccount, useAdminShops } from '../queries.ts'
import { STAGE_TONE, day } from './shared.ts'

const FILTERS = ['all', 'ending', 'unpaid', 'stopped', 'auto'] as const
type Filter = (typeof FILTERS)[number]

const matches: Record<Filter, (shop: AdminShop) => boolean> = {
  all: () => true,
  ending: (shop) => shop.stage === 'ending_soon',
  unpaid: (shop) => shop.stage === 'overdue',
  stopped: (shop) => shop.stage === 'stopped',
  auto: (shop) => shop.auto_charge !== null,
}

/** /dashboard/admin: Oak Order's admin page (founder's pick 2B): every
 * shop's plan, the soonest to run out first. Only for the founder's login
 * (ADMIN_PHONES); the API refuses anyone else. */
export function AdminShops() {
  const t = useT()
  const a = t.admin
  const account = useAccount()
  const shops = useAdminShops()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  if (account.data && !account.data.is_admin) return <Navigate to="/dashboard" replace />

  const words = query.trim().toLowerCase()
  const digits = words.replace(/\D/g, '')
  const shown = (shops.data ?? []).filter(
    (shop) =>
      matches[filter](shop) &&
      (!words ||
        shop.name.toLowerCase().includes(words) ||
        shop.slug.includes(words) ||
        (digits.length > 2 && shop.login.replace(/\D/g, '').includes(digits))),
  )
  return (
    <>
      <title>{a.title}</title>
      <PageHeader title={a.title} back="/dashboard/settings" />
      <div className="space-y-4">
        <Input
          type="search"
          leading={<Search aria-hidden className="size-4" />}
          placeholder={a.search}
          aria-label={a.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div role="group" aria-label={a.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-600 ${
                filter === key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {a.filters[key]}
            </button>
          ))}
        </div>
        {shops.isPending ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : shops.error ? (
          <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState icon={Search} title={a.none} />
        ) : (
          <>
            <p className="text-sm text-slate-500 sm:px-1">{a.count(shown.length)}</p>
            <Card>
              <ul className="divide-y divide-slate-100">
                {shown.map((shop) => (
                  <li key={shop.id}>
                    <ShopRow shop={shop} a={a} />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function ShopRow({ shop, a }: { shop: AdminShop; a: Messages['admin'] }) {
  return (
    <Link
      to={`/dashboard/admin/${shop.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl"
    >
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium text-slate-900">{shop.name}</span>
          <Badge tone={STAGE_TONE[shop.stage]}>{a.stage[shop.stage]}</Badge>
          <Badge>{shop.on_trial ? a.trial : a.paying}</Badge>
          {!shop.is_open && <Badge tone="red">{a.closed}</Badge>}
        </span>
        <span className="block truncate text-sm text-slate-500">
          /shop/{shop.slug} · {formatPhone(shop.login)}
        </span>
        <span className="block text-sm text-slate-600">
          {a.paidUntil(day(shop.paid_until))}
          {shop.stage === 'overdue' && ` · ${a.payBy(day(shop.pay_by))}`}
        </span>
        {shop.auto_charge && (
          <span className="block text-sm text-slate-600">
            {shop.next_charge ? a.nextCharge(shop.auto_charge, day(shop.next_charge)) : a.autoChargeOnly(shop.auto_charge)}
          </span>
        )}
        {shop.last_failure && <span className="block text-sm text-amber-800">{a.lastFailure(shop.last_failure)}</span>}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}
