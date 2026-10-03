import { ChevronRight, Search, SearchX, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import { formatOrderCount, formatSpent } from '../../lib/customers.ts'
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

  if (list.isPending) return <ListSkeleton />
  if (list.error) {
    return (
      <>
        <PageHeader title="Customers" />
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      </>
    )
  }

  const { total } = list.data.pages[0]
  const shown = list.data.pages.flatMap((page) => page.customers)
  if (total === 0 && !search) {
    return (
      <>
        <PageHeader title="Customers" />
        <EmptyState icon={Users} title="No customers yet">
          Everyone who orders from your shop shows up here, with their phone number and orders.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Customers" />
      <Input
        type="search"
        aria-label="Search customers"
        placeholder="Name or phone number"
        enterKeyHint="search"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        leading={<Search aria-hidden className="size-4.5" />}
      />
      <p aria-live="polite" className="mt-3 mb-2 px-1 text-sm text-slate-500">
        {search
          ? `${total} found`
          : `${total} ${total === 1 ? 'customer' : 'customers'}`}
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No customers found">
          No name or phone number matches “{search}”.
        </EmptyState>
      ) : (
        <Card className={`divide-y divide-slate-100 overflow-hidden transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
          {shown.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} currency={currency} />
          ))}
        </Card>
      )}
      {list.hasNextPage && (
        <Button
          variant="secondary"
          loading={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
          className="mt-4 w-full"
        >
          Show more
        </Button>
      )}
    </>
  )
}

function CustomerRow({ customer, currency }: { customer: CustomerSummary; currency: Currency }) {
  return (
    <Link
      to={`/dashboard/customers/${customer.id}`}
      className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{customer.name}</span>
        <span className="mt-0.5 block text-sm text-slate-700">{formatPhone(customer.phone)}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {formatOrderCount(customer.order_count)}
          {customer.last_order_at && ` · last ${formatOrderTime(customer.last_order_at)}`}
        </span>
      </span>
      <span className="shrink-0 text-right font-semibold text-slate-900">{formatSpent(customer.spent, currency)}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <>
      <PageHeader title="Customers" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="mt-3 mb-2 h-4 w-24" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 p-3 sm:p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </Card>
    </>
  )
}
