import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search, SearchX, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatSpent } from '../../lib/customers.ts'
import { formatOrderTime, formatPhone } from '../../lib/orders.ts'
import type { Currency, CustomerSummary } from '../../lib/types.ts'
import { useDebounced } from '../../lib/useDebounced.ts'
import { useCustomers, useStore } from '../queries.ts'

/** /dashboard/customers: everyone who has ordered, whoever ordered last
 * first; find one by name or phone number. */
export function CustomerList() {
  const [params, setParams] = useSearchParams()
  // The search box is the seller's own: it starts from the URL (so coming
  // back from a customer keeps the search) but doesn't follow it after.
  const [typed, setTyped] = useState(() => params.get('q') ?? '')
  const search = useDebounced(typed.trim(), 300)
  const inUrl = params.get('q') ?? ''
  useEffect(() => {
    if (search !== inUrl) setParams(search ? { q: search } : {}, { replace: true })
  }, [search, inUrl, setParams])

  const list = useCustomers(search)
  const currency = useStore().data?.currency ?? 'USD'
  const t = useT()
  const c = t.customers

  if (list.isPending) return <ListSkeleton />
  if (list.error) {
    return (
      <>
        <PageHeader title={c.title} />
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      </>
    )
  }

  const { total } = list.data.pages[0]
  const shown = list.data.pages.flatMap((page) => page.customers)
  if (total === 0 && !search) {
    return (
      <>
        <PageHeader title={c.title} />
        <EmptyState icon={Users} title={c.emptyTitle}>
          {c.emptyText}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title={c.title} />
      <Input
        type="search"
        aria-label={c.search}
        placeholder={c.searchPlaceholder}
        enterKeyHint="search"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        leading={<Search aria-hidden className="size-4.5" />}
      />
      <p aria-live="polite" className="mt-3 mb-2 sm:px-1 text-sm text-slate-500">
        {search ? c.found(total) : c.count(total)}
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title={c.notFoundTitle}>
          {c.notFoundText(search)}
        </EmptyState>
      ) : (
        <div className={`transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
          <Card className="divide-y divide-slate-100 overflow-hidden lg:hidden">
            {shown.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} currency={currency} search={search} />
            ))}
          </Card>
          <CustomerTable customers={shown} currency={currency} search={search} />
        </div>
      )}
      {list.hasNextPage && (
        <Button
          variant="secondary"
          loading={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
          className="mt-4 w-full"
        >
          {t.orders.showMore}
        </Button>
      )}
    </>
  )
}

function CustomerRow({
  customer,
  currency,
  search,
}: {
  customer: CustomerSummary
  currency: Currency
  search: string
}) {
  const t = useT()
  return (
    <Link
      to={`/dashboard/customers/${customer.id}`}
      // Back to this list with this search.
      state={{ back: search ? `/dashboard/customers?q=${encodeURIComponent(search)}` : '/dashboard/customers' }}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <Initial name={customer.name} className="size-10 text-base" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{customer.name}</span>
        <span className="mt-0.5 block text-sm text-slate-700">{formatPhone(customer.phone)}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {t.customers.orderCount(customer.order_count)}
          {customer.last_order_at && t.customers.lastOrder(formatOrderTime(customer.last_order_at))}
        </span>
      </span>
      <span className="shrink-0 text-right font-semibold text-slate-900">{formatSpent(customer.spent, currency)}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

type SortKey = 'name' | 'orders' | 'last' | 'spent'

/** Laptops: a table (founder's pick, 2026-10-08), sorted by any column
 * among the customers loaded so far (newest first until then). */
function CustomerTable({ customers, currency, search }: { customers: CustomerSummary[]; currency: Currency; search: string }) {
  const t = useT()
  const c = t.customers
  const [sort, setSort] = useState<{ key: SortKey; up: boolean } | null>(null)
  // What they spent in the shop's currency (another only if it changed).
  const spentIn = (customer: CustomerSummary) =>
    Number(customer.spent.find((a) => a.currency === currency)?.amount ?? customer.spent[0]?.amount ?? 0)
  const value = (customer: CustomerSummary, key: SortKey) =>
    key === 'orders' ? customer.order_count : key === 'spent' ? spentIn(customer) : new Date(customer.last_order_at ?? 0).getTime()
  const sorted = sort
    ? [...customers].sort((a, b) => {
        const by = sort.key === 'name' ? a.name.localeCompare(b.name) : value(a, sort.key) - value(b, sort.key)
        return sort.up ? by : -by
      })
    : customers
  const back = search ? `/dashboard/customers?q=${encodeURIComponent(search)}` : '/dashboard/customers'
  const head = (key: SortKey, label: string, end = false) => {
    const on = sort?.key === key
    return (
      <th scope="col" aria-sort={on ? (sort.up ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 ${end ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={() => setSort(on ? { key, up: !sort.up } : { key, up: key === 'name' })}
          aria-label={c.sortBy(label)}
          className={`inline-flex items-center gap-1 rounded font-semibold hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-navy-600 ${on ? 'text-slate-900' : ''}`}
        >
          {label}
          {on ? (sort.up ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />) : <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />}
        </button>
      </th>
    )
  }
  return (
    <Card className="hidden overflow-hidden lg:block">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            {head('name', c.column.name)}
            <th scope="col" className="px-4 py-3 text-left font-semibold">{c.column.phone}</th>
            {head('orders', c.orders, true)}
            {head('last', c.column.lastOrder)}
            {head('spent', c.spent, true)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((customer) => (
            <tr key={customer.id} className="relative transition-colors hover:bg-slate-50">
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <Initial name={customer.name} />
                  <Link
                    to={`/dashboard/customers/${customer.id}`}
                    state={{ back }}
                    className="truncate font-medium text-slate-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
                  >
                    {customer.name}
                  </Link>
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">{formatPhone(customer.phone)}</td>
              <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{customer.order_count}</td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">{customer.last_order_at ? formatOrderTime(customer.last_order_at) : '–'}</td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">{formatSpent(customer.spent, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/** A customer's first letter in a circle. */
export function Initial({ name, className = 'size-9 text-sm' }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-navy-50 font-bold text-navy-700 ${className}`}>
      {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function ListSkeleton() {
  const t = useT()
  const c = t.customers
  return (
    <>
      <PageHeader title={c.title} />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="mt-3 mb-2 h-4 w-24" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 px-4 py-3 sm:p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </Card>
    </>
  )
}
