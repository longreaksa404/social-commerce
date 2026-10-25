import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Badge, Button, Card, EmptyState, ErrorMessage, ErrorState, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import type { AdminShop, PlanPayment } from '../../lib/types.ts'
import { useAccount, useAdminShops, useCheckClaim } from '../queries.ts'
import { STAGE_TONE, day } from './shared.ts'

const usd = (amount: string) => formatMoney(amount, 'USD')

// What needs the founder first, All last (founder's pick 28A, 2026-10-25).
const FILTERS = ['claimed', 'ending', 'unpaid', 'stopped', 'all'] as const
type Filter = (typeof FILTERS)[number]

const matches: Record<Filter, (shop: AdminShop) => boolean> = {
  all: () => true,
  claimed: (shop) => shop.claim !== null,
  ending: (shop) => shop.stage === 'ending_soon',
  unpaid: (shop) => shop.stage === 'overdue',
  stopped: (shop) => shop.stage === 'stopped',
}

/** /dashboard/admin: Oak Order's admin page (founder's pick 2B): every
 * shop's plan, the soonest to run out first. Only for the founder's login
 * (ADMIN_PHONES); the API refuses anyone else. An inbox of what needs the
 * founder (pick 28A, 2026-10-25): tabs with their counts, opening on
 * "Said paid" while any wait, each with Found it / Not found on its row. */
export function AdminShops() {
  const t = useT()
  const a = t.admin
  const account = useAccount()
  const shops = useAdminShops()
  const [picked, setPicked] = useState<Filter | null>(null)
  const waiting = (shops.data ?? []).some(matches.claimed)
  const filter: Filter = picked ?? (waiting ? 'claimed' : 'all')
  const setFilter = setPicked
  const [query, setQuery] = useState('')
  if (account.data && !account.data.is_admin) return <Navigate to="/dashboard" replace />

  const words = query.trim().toLowerCase()
  const digits = words.replace(/\D/g, '')
  const shown = (shops.data ?? []).filter(
    (shop) =>
      matches[filter](shop) &&
      (!words ||
        shop.name.toLowerCase().includes(words) ||
        shop.code.toLowerCase().includes(words) ||
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
              {shops.data && (
                <span className={`ml-1.5 tabular-nums ${filter === key ? 'text-white/80' : 'text-slate-500'}`}>
                  {shops.data.filter(matches[key]).length}
                </span>
              )}
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
                    {shop.claim && <ClaimButtons shop={shop} claim={shop.claim} />}
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
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center self-start rounded-full bg-navy-50 font-semibold text-navy-700">
        {[...shop.name.trim()][0]?.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium text-slate-900">{shop.name}</span>
          <Badge tone={STAGE_TONE[shop.stage]}>{a.stage[shop.stage]}</Badge>
          <Badge>{shop.on_trial ? a.trial : a.paying}</Badge>
          {!shop.is_open && <Badge tone="red">{a.closed}</Badge>}
        </span>
        <span className="block truncate text-sm text-slate-500">
          <span className="font-mono font-semibold text-slate-700">{shop.code}</span> · /shop/{shop.slug} · {formatPhone(shop.login)}
          {!shop.telegram && ` · ${a.noTelegram}`}
        </span>
        <span className="block text-sm text-slate-600">
          {shop.paid_until ? a.paidUntil(day(shop.paid_until)) : a.notOpened}
          {shop.stage === 'overdue' && ` · ${a.payBy(day(shop.pay_by))}`}
        </span>
        {shop.claim && (
          <span className="block text-sm font-medium text-navy-700">
            {a.claim(usd(shop.claim.amount), shop.claim.period === 'month' ? a.month.toLowerCase() : a.year.toLowerCase(), formatDate(shop.claim.created_at))}
          </span>
        )}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}

/** The two answers to an "I've paid", right on its row: Found it marks it
 * paid at the amount claimed (asks first); Not found tells the seller
 * "No transfer with your code yet" (asks first). Another amount or note:
 * the shop's own page. */
function ClaimButtons({ shop, claim }: { shop: AdminShop; claim: PlanPayment }) {
  const a = useT().admin
  const { confirm, toast } = useFeedback()
  const check = useCheckClaim(shop.id)
  const period = (claim.period === 'month' ? a.month : a.year).toLowerCase()

  async function found() {
    const ok = await confirm({ title: a.foundTitle(shop.name), message: a.confirmMessage(usd(claim.amount), period), confirmLabel: a.found })
    if (ok) check.mutate({ paymentId: claim.id, found: true, note: null }, { onSuccess: (updated) => toast(a.marked(day(updated.paid_until))) })
  }

  async function notFound() {
    const ok = await confirm({ title: a.notFoundTitle, message: a.notFoundDefault, confirmLabel: a.notFound, danger: true })
    if (ok) check.mutate({ paymentId: claim.id, found: false, note: a.notFoundDefault }, { onSuccess: () => toast(a.checked) })
  }

  return (
    <div className="space-y-2 px-4 pb-3">
      <div className="flex gap-2">
        <Button loading={check.isPending && check.variables?.found} disabled={check.isPending} onClick={found} className="flex-1 sm:flex-none">
          {a.found}
        </Button>
        <Button variant="secondary" disabled={check.isPending} onClick={notFound} className="flex-1 sm:flex-none">
          {a.notFound}
        </Button>
      </div>
      <ErrorMessage error={check.error} />
    </div>
  )
}
