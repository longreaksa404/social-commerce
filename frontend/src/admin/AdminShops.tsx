import { ArrowDown, ArrowUp, ChevronRight, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Button, EmptyState, ErrorState, Input, Skeleton } from '../components/ui.tsx'
import { cardClass } from '../components/styles.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminShop as Shop } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { AdminShop } from './AdminShop.tsx'
import { ShopLogo, StageWords } from './ShopBits.tsx'
import { useListParams } from './listParams.ts'
import { useAdminShops } from './queries.ts'
import { ago, date, shortDay } from './shared.ts'
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
const SORT_KEYS = Object.keys(compare) as SortKey[]

/** /admin/shops and /admin/shops/:storeId: every shop (founder's pick
 * 4B, 2026-10-28), a table on a laptop and cards on a phone. A shop opens
 * beside the list (pick 5D), which narrows to a 280-320 px column so the
 * shop gets the width (redesign pick 6A, 2026-11-06); the open shop stays
 * pinned at the top when the filter hides it. The filter, search and sort
 * are in the address (useListParams), so Back and a reload keep them. On a
 * phone a shop is its own page. */
export function AdminShops() {
  const { storeId } = useParams()
  const shops = useAdminShops()
  const { params, update, listSearch } = useListParams()
  const picked = FILTERS.find((f) => f === params.get('show')) ?? null
  const query = params.get('q') ?? ''
  const sortParam = params.get('sort') ?? 'paid_until'
  const sort: Sort = { key: SORT_KEYS.find((k) => k === sortParam.replace(/^-/, '')) ?? 'paid_until', up: !sortParam.startsWith('-') }
  const setSort = (next: Sort) => update({ sort: `${next.up ? '' : '-'}${next.key}` })
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
  const open = storeId ? (shops.data ?? []).find((shop) => shop.id === storeId) : undefined
  const pinned = open && !shown.includes(open) ? open : undefined

  const chips = FILTERS.map((key) => (
    <Chip key={key} on={filter === key} onClick={() => update({ show: key })}>
      {FILTER_LABEL[key]}
      {shops.data && <span className={`ml-1.5 tabular-nums ${filter === key ? 'text-white/80' : 'text-slate-500'}`}>{shops.data.filter(matches[key]).length}</span>}
    </Chip>
  ))
  const list = (
    <div className="space-y-3">
      <div className={storeId ? '' : 'lg:max-w-md'}>
        <Input
          type="search"
          leading={<Search aria-hidden className="size-4" />}
          placeholder="Name, code, link or phone"
          aria-label="Search shops"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
        />
      </div>
      {storeId ? (
        // Beside a shop: the chips in one row that scrolls, so the list
        // starts high in the narrow column.
        <div role="group" aria-label="Show" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips}
        </div>
      ) : (
        <Chips label="Show">{chips}</Chips>
      )}
      {shops.isPending ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : shops.error ? (
        <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
      ) : storeId ? (
        <Column shops={shown} selected={storeId} pinned={pinned} filter={FILTER_LABEL[filter]} search={listSearch} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title={words ? `No shops match “${query.trim()}”` : 'No shops here'}
          action={
            words ? (
              <Button variant="secondary" onClick={() => update({ q: null })}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 sm:px-1">{shown.length === 1 ? '1 shop' : `${shown.length} shops`}</p>
          <Table shops={shown} sort={sort} onSort={setSort} search={listSearch} />
          <Cards shops={shown} search={listSearch} />
        </>
      )}
    </div>
  )

  return (
    <>
      <title>Shops · Oak Order admin</title>
      <AdminPageHeader title="Shops" phone={!storeId} />
      {storeId ? (
        <div className="lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="hidden lg:sticky lg:top-5 lg:block lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto lg:pb-2">{list}</div>
          <AdminShop key={storeId} storeId={storeId} />
        </div>
      ) : (
        list
      )}
    </>
  )
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
function Table({ shops, sort, onSort, search }: { shops: Shop[]; sort: Sort; onSort: (s: Sort) => void; search: string }) {
  return (
    <div className={`${cardClass} hidden overflow-x-auto lg:block`}>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <SortHeader label="Shop" k="name" sort={sort} onSort={onSort} />
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Code
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Signed up
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Owner's phone
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Stage
            </th>
            <SortHeader label="Paid until" k="paid_until" sort={sort} onSort={onSort} />
            <SortHeader label="Orders" k="orders" sort={sort} onSort={onSort} right />
            <SortHeader label="Last order" k="last_order" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shops.map((shop) => (
            <tr key={shop.id} className="relative transition-colors hover:bg-slate-50">
              <td className="min-w-56 px-4 py-2.5">
                <Link
                  to={`/admin/shops/${shop.id}${search}`}
                  className="flex items-center gap-3 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
                >
                  <ShopLogo shop={shop} />
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-medium break-words text-slate-900">{shop.name}</span>
                    <span className="block truncate text-xs text-slate-500">{shop.owner_name}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span className="block font-semibold tracking-wide text-slate-700">{shop.code}</span>
                <span className="block text-xs text-slate-500">{shop.currency === 'KHR' ? 'Sells in riel' : 'Sells in dollars'}</span>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{date(shop.created_at)}</td>
              <td className="max-w-[12rem] truncate px-4 py-2.5 text-slate-700 tabular-nums">{formatPhone(shop.login)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <StageWords shop={shop} />
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{shop.paid_until ? shortDay(shop.paid_until) : '—'}</td>
              <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">{shop.orders.toLocaleString('en-US')}</td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{shop.last_order_at ? ago(shop.last_order_at) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Phones: each shop a card. */
function Cards({ shops, search }: { shops: Shop[]; search: string }) {
  return (
    <ul className={`${cardClass} divide-y divide-slate-100 lg:hidden`}>
      {shops.map((shop) => (
        <li key={shop.id}>
          <Row shop={shop} search={search}>
            <span className="block truncate text-xs text-slate-500">
              <span className="font-semibold tracking-wide text-slate-700">{shop.code}</span> · {formatPhone(shop.login)} · {shop.orders} orders
            </span>
          </Row>
        </li>
      ))}
    </ul>
  )
}

/** Laptops, with a shop open beside it: the list as one narrow column,
 * the open shop pinned at the top when the filter hides it. */
function Column({ shops, selected, pinned, filter, search }: { shops: Shop[]; selected: string; pinned?: Shop; filter: string; search: string }) {
  return (
    <div className={`${cardClass} overflow-hidden`}>
      {pinned && (
        <div className="border-b border-slate-200 bg-slate-50">
          <p className="px-4 pt-2 text-xs font-semibold text-slate-500">Open now · not in “{filter}”</p>
          <Row shop={pinned} selected search={search} />
        </div>
      )}
      {shops.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">No shops here</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shops.map((shop) => (
            <li key={shop.id}>
              <Row shop={shop} selected={shop.id === selected} search={search} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ shop, selected = false, search, children }: { shop: Shop; selected?: boolean; search: string; children?: ReactNode }) {
  return (
    <Link
      to={`/admin/shops/${shop.id}${search}`}
      aria-current={selected ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 ${
        selected ? 'bg-navy-50' : 'hover:bg-slate-50'
      }`}
    >
      <ShopLogo shop={shop} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium break-words text-slate-900">{shop.name}</span>
        <span className="block truncate text-sm">
          <StageWords shop={shop} />
        </span>
        {children}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400 lg:hidden" />
    </Link>
  )
}
