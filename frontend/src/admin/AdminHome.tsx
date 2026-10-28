import { ChevronRight, PartyPopper } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import type { AdminNeed, AdminOverview } from '../lib/types.ts'
import { DailyBars } from './DailyBars.tsx'
import { useAdminOverview } from './queries.ts'
import { shortDay } from './shared.ts'

const usd = (amount: string | number) => formatMoney(amount, 'USD')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** /admin: the admin's Home (founder's pick 3B, 2026-10-28): Oak Order's
 * numbers first, then the shops that need the admin, most urgent first
 * (a waiting "I've paid" leads; checking it is on the shop's page). */
export function AdminHome() {
  const overview = useAdminOverview()
  return (
    <>
      <title>Home · Oak Order admin</title>
      <PageHeader title="Home" />
      {overview.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : overview.error ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="space-y-6">
          <Numbers data={overview.data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <DailyBars
              title="Orders per day"
              days={overview.data.days.map((d) => ({ day: d.day, value: d.orders }))}
              unit={(n) => plural(n, 'order')}
            />
            <DailyBars
              title="Sign-ups per day"
              days={overview.data.days.map((d) => ({ day: d.day, value: d.signups }))}
              unit={(n) => plural(n, 'sign-up')}
            />
          </div>
          <Needs data={overview.data} />
        </div>
      )}
    </>
  )
}

function Numbers({ data }: { data: AdminOverview }) {
  // Today in Phnom Penh, as the API counts it.
  const today = new Date(`${data.days.at(-1)?.day ?? ''}T00:00`)
  const month = today.toLocaleDateString('en-GB', { month: 'long' })
  const { shops } = data
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Shops" value={shops.total}>
        {shops.paying} paying · {shops.trial} on trial · {shops.setup} in setup
        {shops.stopped > 0 && <span className="text-red-700"> · {shops.stopped} stopped</span>}
      </Tile>
      <Tile label={`Collected in ${month}`} value={usd(data.collected_month)}>
        {plural(data.payments_month, 'payment')} · {today.getFullYear()}: {usd(data.collected_year)}
      </Tile>
      <Tile label="If all renew" value={usd(data.monthly_income)}>
        a month
      </Tile>
      <Tile label="Orders today" value={data.orders_today}>
        {data.orders_week} in 7 days
      </Tile>
    </div>
  )
}

function Tile({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <Card className="mx-0 rounded-2xl p-4 sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 tabular-nums">{children}</p>
    </Card>
  )
}

function Needs({ data }: { data: AdminOverview }) {
  const count = data.needs.length + (data.telegram_failed > 0 ? 1 : 0)
  return (
    <section aria-labelledby="needs">
      <h2 id="needs" className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">
        Needs you · {count}
      </h2>
      {count === 0 ? (
        <EmptyState icon={PartyPopper} title="Nothing needs you" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {data.needs.map((need) => (
              <li key={`${need.kind}-${need.store_id}`}>
                <Link
                  to={`/admin/shops/${need.store_id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
                >
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-50 font-semibold text-navy-700">
                    {[...need.name.trim()][0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{need.name}</span>
                    <NeedText need={need} />
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
            {data.telegram_failed > 0 && (
              <li className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">Telegram</span>
                  <span className="block text-sm text-amber-700">{plural(data.telegram_failed, 'message')} failed in 24 hours</span>
                </span>
              </li>
            )}
          </ul>
        </Card>
      )}
    </section>
  )
}

/** What's wrong, in words; red and amber on the words only. */
function NeedText({ need }: { need: AdminNeed }) {
  const day = need.day ? shortDay(need.day) : ''
  const nextDay = need.day ? shortDay(addDay(need.day)) : ''
  switch (need.kind) {
    case 'claim':
      return (
        <span className="block text-sm font-medium text-navy-700">
          Says paid {usd(need.amount ?? 0)} for a {need.period} · {day}
        </span>
      )
    case 'stopped':
      return <span className="block text-sm text-red-700">No new orders since {nextDay}</span>
    case 'unpaid':
      return <span className="block text-sm text-red-700">Unpaid · orders stop {nextDay}</span>
    case 'ending':
      return <span className="block text-sm text-amber-700">{need.on_trial ? 'Trial ends' : 'Paid time ends'} {day}</span>
    case 'not_opened':
      return <span className="block text-sm text-slate-500">Not opened · signed up {day}</span>
  }
}

function addDay(ymd: string) {
  const date = new Date(`${ymd}T00:00`)
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
