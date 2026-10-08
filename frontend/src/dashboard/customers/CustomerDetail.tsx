import { Copy, MapPin, Phone } from 'lucide-react'
import { useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatSpent } from '../../lib/customers.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import type { CustomerDetail as Customer } from '../../lib/types.ts'
import { OrderRow } from '../orders/OrderRow.tsx'
import { useCustomer, useStore } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'
import { Initial } from './CustomerList.tsx'

/** /dashboard/customers/:customerId: who they are, and their orders. */
export function CustomerDetail() {
  const { customerId = '' } = useParams()
  const customer = useCustomer(customerId)
  const back = useBackTo('/dashboard/customers')
  const t = useT()

  if (customer.isPending) return <DetailSkeleton back={back} />
  if (customer.error) {
    return (
      <>
        <PageHeader title={t.customers.customer} back={back} />
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      </>
    )
  }
  return <CustomerView customer={customer.data} back={back} />
}

function CustomerView({ customer, back }: { customer: Customer; back: string }) {
  const currency = useStore().data?.currency ?? 'USD'
  const { toast } = useFeedback()
  const t = useT()
  const c = t.customers

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(formatPhone(customer.phone))
      toast(c.phoneCopied)
    } catch {
      toast(c.copyFailed, 'error')
    }
  }
  const leftOut = customer.orders.some((o) => o.status === 'rejected' || o.status === 'cancelled')
  return (
    <>
      <PageHeader title={customer.name} back={back} />
      <title>{customer.name}</title>

      <div className="space-y-4">
        {/* Who they are, with calling them one tap away (founder's pick,
            2026-10-08). */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Initial name={customer.name} className="size-14 text-xl" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900">{customer.name}</p>
              <p className="text-sm text-slate-500 tabular-nums">
                {formatPhone(customer.phone)}
                <span className="text-slate-400"> · </span>
                {c.since(formatDate(customer.created_at))}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <a href={`tel:${customer.phone}`} className={`${buttonClass('primary')} flex-1`}>
              <Phone aria-hidden className="size-4" />
              {c.call}
            </a>
            <Button variant="secondary" icon={Copy} onClick={copyPhone} className="flex-1">
              {c.copyPhone}
            </Button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-sm text-slate-500">{c.orders}</dt>
              <dd className="text-xl font-bold text-slate-900 tabular-nums">{customer.order_count}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-sm text-slate-500">{c.spent}</dt>
              <dd className="text-xl font-bold break-words text-slate-900 tabular-nums">{formatSpent(customer.spent, currency)}</dd>
            </div>
          </dl>
          {leftOut && <p className="mt-2 text-xs text-slate-500">{c.leftOut}</p>}

          {customer.address && (
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{c.latestAddress}</p>
                <p className="whitespace-pre-line break-words text-slate-900">{customer.address}</p>
              </div>
            </div>
          )}
        </Card>

        <section aria-labelledby="customer-orders">
          <h2 id="customer-orders" className="mb-2 sm:px-1 font-semibold text-slate-900">
            {c.orders}
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
            <p className="mt-2 sm:px-1 text-sm text-slate-500">
              {c.latestOrders(customer.orders.length, customer.order_count)}
            </p>
          )}
        </section>
      </div>
    </>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  const t = useT()
  return (
    <>
      <PageHeader title={t.customers.customer} back={back} />
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
            <div key={i} className="space-y-2 px-4 py-3 sm:p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
