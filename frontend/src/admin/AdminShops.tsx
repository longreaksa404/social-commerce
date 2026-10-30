import { ArrowDown, ArrowUp, ChevronRight, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../components/ui.tsx'
import { cardClass } from '../components/styles.ts'
import { formatMoney } from '../lib/money.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminShop as Shop } from '../lib/types.ts'
import { AdminShop } from './AdminShop.tsx'
import { useAdminShops } from './queries.ts'
import { ago, shortDay } from './shared.ts'
import { Chip, Chips } from './ui.tsx'

// What needs the founder first, All last (pick 28A, 2026-10-25).
const FILTERS = ['claimed', 'ending', 'unpaid', 'stopped', 'trial', 'setup', 'closed', 'all'] as const
type Filter = (typeof FILTERS)[number]
const FILTER_LABEL: Record<Filter, string> = {
  claimed: 'Says paid',
  ending: 'Ending',
  unpaid: 'Unpaid',
  stopped: 'Stopped',
  trial: 'Trial',
  setup: 'Setup',
  closed: 'Closed',
  all: 'All',
}
const matches: Record<Filter, (shop: Shop) => boolean> = {
  all: () => true,
  claimed: (shop) => shop.claim !== null,
  ending: (shop) => shop.is_open && shop.stage === 'ending_soon',
  unpaid: (shop) => shop.is_open && shop.stage === 'overdue',
  stopped: (shop) => shop.is_open && shop.stage === 'stopped',
  trial: (shop) => shop.is_open && shop.on_trial && shop.stage !== 'setup' && shop.stage !== 'stopped',
  setup: (shop) => shop.is_open && shop.stage === 'setup',
  closed: (shop) => !shop.is_open,
}

type SortKey = 'name' | 'paid_until' | 'orders' | 'last_order'
type Sort = { key: SortKey; up: boolean }
const compare: Record<SortKey, (a: Shop, b: Shop) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  // Shops in setup (no date) last.
  paid_until: (a, b) => (a.paid_until ?? '9999').localeCompare(b.paid_until ?? '9999'),
  orders: (a, b) => a.orders - b.orders,
  last_order: (a, b) => (a.last_order_at ?? '').localeCompare(b.last_order_at ?? ''),
}

/** /admin/shops and /admin/shops/:storeId: every shop (founder's pick
 * 4B, 2026-10-28), a table on a laptop and cards on a phone; a shop opens
 * beside the list (pick 5D), the list narrowing to a column, so going
 * through several shops is one click each. On a phone a shop is its own
 * page. */
export function AdminShops() {
  const { storeId } = useParams()
  const shops = useAdminShops()
  const [picked, setPicked] = useState<Filter | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'paid_until', up: true })
  const waiting = (shops.data ?? []).some(matches.claimed)
  const filter: Filter = picked ?? (waiting ? 'claimed' : 'all')

  const words = query.trim().toLowerCase()
  const digits = words.replace(/\D/g, '')
  const shown = (shops.data ?? [])
    .filter(
      (shop) =>
        matches[filter](shop) &&
        (!words ||
          shop.name.toLowerCase().includes(words) ||
          shop.owner_name.toLowerCase().includes(words) ||
          shop.code.toLowerCase().includes(words) ||
          shop.slug.includes(words) ||
          (digits.length > 2 && shop.login.replace(/\D/g, '').includes(digits))),
    )
    .sort((a, b) => (sort.up ? 1 : -1) * compare[sort.key](a, b))

  const list = (
    <div className="space-y-3">
      <Input
        type="search"
        leading={<Search aria-hidden className="size-4" />}
        placeholder="Name, code, link or phone"
        aria-label="Search shops"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Chips label="Show">
        {FILTERS.map((key) => (
          <Chip key={key} on={filter === key} onClick={() => setPicked(key)}>
            {FILTER_LABEL[key]}
            {shops.data && (
              <span className={`ml-1.5 tabular-nums ${filter === key ? 'text-white/80' : 'text-slate-500'}`}>
                {shops.data.filter(matches[key]).length}
              </span>
            )}
          </Chip>
        ))}
      </Chips>
      {shops.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : shops.error ? (
        <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="No shops here" />
      ) : storeId ? (
        <Column shops={shown} selected={storeId} />
      ) : (
        <>
          <p className="text-sm text-slate-500 sm:px-1">{shown.length === 1 ? '1 shop' : `${shown.length} shops`}</p>
          <Table shops={shown} sort={sort} onSort={setSort} />
          <Cards shops={shown} />
        </>
      )}
    </div>
  )

  return (
    <>
      <title>Shops · Oak Order admin</title>
      {storeId ? (
        <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="hidden lg:sticky lg:top-8 lg:block lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:pb-2">
            <PageHeader title="Shops" />
            {list}
          </div>
          <AdminShop key={storeId} storeId={storeId} />
        </div>
      ) : (
        <>
          <PageHeader title="Shops" />
          {list}
        </>
      )}
    </>
  )
}

/** The shop's logo, round as customers see it, or its first letter. */
export function ShopLogo({ shop, size = 'size-9' }: { shop: Pick<Shop, 'name' | 'logo_url'>; size?: string }) {
  const [failed, setFailed] = useState(false)
  if (shop.logo_url && !failed) {
    return <img src={shop.logo_url} alt="" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-navy-50 font-semibold text-navy-700`}>
      {[...shop.name.trim()][0]?.toUpperCase()}
    </span>
  )
}

/** Where a shop stands, in words; red and amber on the words only. */
export function StageWords({ shop }: { shop: Shop }) {
  if (!shop.is_open) return <span className="text-slate-500">Closed</span>
  if (shop.claim) return <span className="font-semibold text-navy-700">Says paid {formatMoney(shop.claim.amount, 'USD')}</span>
  switch (shop.stage) {
    case 'stopped':
      return <span className="font-semibold text-red-700">No new orders</span>
    case 'overdue':
      return <span className="font-semibold text-red-700">Unpaid · pay by {shop.pay_by ? shortDay(shop.pay_by) : ''}</span>
    case 'ending_soon':
      return <span className="font-semibold text-amber-700">{shop.on_trial ? 'Trial ends' : 'Ends'} {shop.paid_until ? shortDay(shop.paid_until) : ''}</span>
    case 'setup':
      return <span className="text-slate-500">Setup</span>
    default:
      return <span className="text-slate-500">{shop.on_trial ? 'Trial' : 'Paying'}</span>
  }
}

function SortHeader({ label, k, sort, onSort, right = false }: { label: string; k: SortKey; sort: Sort; onSort: (s: Sort) => void; right?: boolean }) {
  const on = sort.key === k
  const Arrow = sort.up ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={on ? (sort.up ? 'ascending' : 'descending') : 'none'} className={`px-4 py-2.5 font-medium ${right ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort({ key: k, up: on ? !sort.up : k === 'name' || k === 'paid_until' })}
        className={`inline-flex items-center gap-1 rounded hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-navy-600 ${on ? 'text-navy-700' : ''}`}
      >
        {label}
        {on && <Arrow aria-hidden className="size-3.5" />}
      </button>
    </th>
  )
}

/** Laptops: every fact in its own column; a column's name sorts by it. */
function Table({ shops, sort, onSort }: { shops: Shop[]; sort: Sort; onSort: (s: Sort) => void }) {
  return (
    <div className={`${cardClass} hidden overflow-x-auto lg:block`}>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <SortHeader label="Shop" k="name" sort={sort} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Code</th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Owner's phone</th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Stage</th>
            <SortHeader label="Paid until" k="paid_until" sort={sort} onSort={onSort} />
            <SortHeader label="Orders" k="orders" sort={sort} onSort={onSort} right />
            <SortHeader label="Last order" k="last_order" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shops.map((shop) => (
            <tr key={shop.id} className="relative transition-colors hover:bg-slate-50">
              <td className="max-w-[18rem] px-4 py-2.5">
                <Link to={`/admin/shops/${shop.id}`} className="flex items-center gap-3 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600">
                  <ShopLogo shop={shop} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{shop.name}</span>
                    <span className="block truncate text-xs text-slate-500">{shop.owner_name}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2.5 font-semibold tracking-wide whitespace-nowrap text-slate-700">{shop.code}</td>
              <td className="max-w-[12rem] truncate px-4 py-2.5 text-slate-700 tabular-nums">{formatPhone(shop.login)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <StageWords shop={shop} />
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{shop.paid_until ? shortDay(shop.paid_until) : '—'}</td>
              <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">{shop.orders}</td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{shop.last_order_at ? ago(shop.last_order_at) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Phones: each shop a card. */
function Cards({ shops }: { shops: Shop[] }) {
  return (
    <ul className={`${cardClass} divide-y divide-slate-100 lg:hidden`}>
      {shops.map((shop) => (
        <li key={shop.id}>
          <Row shop={shop}>
            <span className="block truncate text-xs text-slate-500">
              <span className="font-semibold tracking-wide text-slate-700">{shop.code}</span> · {formatPhone(shop.login)} · {shop.orders} orders
            </span>
          </Row>
        </li>
      ))}
    </ul>
  )
}

/** Laptops, with a shop open beside it: the list as one narrow column. */
function Column({ shops, selected }: { shops: Shop[]; selected: string }) {
  return (
    <ul className={`${cardClass} divide-y divide-slate-100`}>
      {shops.map((shop) => (
        <li key={shop.id}>
          <Row shop={shop} selected={shop.id === selected} />
        </li>
      ))}
    </ul>
  )
}

function Row({ shop, selected = false, children }: { shop: Shop; selected?: boolean; children?: ReactNode }) {
  return (
    <Link
      to={`/admin/shops/${shop.id}`}
      aria-current={selected ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl ${
        selected ? 'bg-navy-50' : 'hover:bg-slate-50'
      }`}
    >
      <ShopLogo shop={shop} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{shop.name}</span>
        <span className="block truncate text-sm">
          <StageWords shop={shop} />
        </span>
        {children}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}
