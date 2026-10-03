import { MapPin, Phone } from 'lucide-react'
import { useParams } from 'react-router'
import { Card, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { formatSpent } from '../../lib/customers.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import type { CustomerDetail as Customer } from '../../lib/types.ts'
import { OrderRow } from '../orders/OrderRow.tsx'
import { useCustomer, useStore } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'

/** /dashboard/customers/:customerId: who they are, and their orders. */
export function CustomerDetail() {
  const { customerId = '' } = useParams()
  const customer = useCustomer(customerId)
  const back = useBackTo('/dashboard/customers')

  if (customer.isPending) return <DetailSkeleton back={back} />
  if (customer.error) {
    return (
      <>
        <PageHeader title="Customer" back={back} />
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      </>
    )
  }
  return <CustomerView customer={customer.data} back={back} />
}

function CustomerView({ customer, back }: { customer: Customer; back: string }) {
  const currency = useStore().data?.currency ?? 'USD'
  const leftOut = customer.orders.some((o) => o.status === 'rejected' || o.status === 'cancelled')
  return (
    <>
      <PageHeader title={customer.name} back={back} />
      <title>{customer.name}</title>

      <div className="space-y-4">
        <Card className="p-4 sm:p-6">
          <a
            href={`tel:${customer.phone}`}
            className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Phone aria-hidden className="size-4" />
            {formatPhone(customer.phone)}
          </a>
          {customer.address && (
            <div className="mt-1 flex gap-2">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Latest address</p>
                <p className="whitespace-pre-line break-words text-slate-900">{customer.address}</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-sm text-slate-500">Customer since {formatDate(customer.created_at)}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <dt className="text-sm text-slate-500">Orders</dt>
              <dd className="text-lg font-bold text-slate-900">{customer.order_count}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Spent</dt>
              <dd className="text-lg font-bold break-words text-slate-900">{formatSpent(customer.spent, currency)}</dd>
            </div>
          </dl>
          {leftOut && (
            <p className="mt-2 text-xs text-slate-500">Rejected and cancelled orders don't count toward what they spent.</p>
          )}
        </Card>

        <section aria-labelledby="customer-orders">
          <h2 id="customer-orders" className="mb-2 px-1 font-semibold text-slate-900">
            Orders
          </h2>
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {customer.orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                showCustomer={false}
                back={`/dashboard/customers/${customer.id}`}
              />
            ))}
          </Card>
          {customer.order_count > customer.orders.length && (
            <p className="mt-2 px-1 text-sm text-slate-500">
              Their latest {customer.orders.length} of {customer.order_count} orders. The older ones are in Orders.
            </p>
          )}
        </section>
      </div>
    </>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  return (
    <>
      <PageHeader title="Customer" back={back} />
      <div className="space-y-4">
        <Card className="space-y-3 p-4 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </Card>
        <Card className="divide-y divide-slate-100">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
