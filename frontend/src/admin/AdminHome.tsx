import { Activity, ChevronRight, PartyPopper, Send } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui.tsx'
import { AdminPageHeader } from './AdminHeader.tsx'
import { formatMoney } from '../lib/money.ts'
import type { AdminNeed, AdminNotice, AdminOverview } from '../lib/types.ts'
import { ChartCard, type ChartPoint } from './Chart.tsx'
import { useAdminNotices, useAdminOverview, useFirstSignupDay } from './queries.ts'
import { addDays, dayMonth, monthName, shortDay } from './shared.ts'

const usd = (amount: string | number) => formatMoney(amount, 'USD')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** /admin: the admin's Home (founder's pick 3B, 2026-10-28; tidied by
 * the redesign's 3B, 2026-11-06): Oak Order's numbers first, the two daily
 * charts side by side, then the shops and the system that need the admin,
 * most urgent first (a waiting "I've paid" leads; checking it is on the
 * shop's page). Names wrap instead of being cut. */
export function AdminHome() {
  const overview = useAdminOverview()
  return (
    <>
      <title>Home · Oak Order admin</title>
      <AdminPageHeader
        title="Home"
        subtitle={overview.data ? `Phnom Penh time · today ${shortDay(overview.data.days.at(-1)?.day ?? '')}` : undefined}
      />
      {overview.isPending ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-60 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
          </div>
        </div>
      ) : overview.error ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="space-y-6">
          <Numbers data={overview.data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <DailyChart data={overview.data} measure="orders" />
            <DailyChart data={overview.data} measure="signups" />
          </div>
          <Needs data={overview.data} />
        </div>
      )}
    </>
  )
}

/** Orders or sign-ups per Phnom Penh day for 30 days (pick 4A): today
 * "so far", the days before the first shop as "No shops yet". */
function DailyChart({ data, measure }: { data: AdminOverview; measure: 'orders' | 'signups' }) {
  const first = useFirstSignupDay()
  const word = measure === 'orders' ? 'order' : 'sign-up'
  const last = data.days.length - 1
  const points: ChartPoint[] = data.days.map((d, i) => ({
    key: d.day,
    label: i === last ? 'Today' : dayMonth(d.day),
    long: i === last ? `Today, ${shortDay(d.day)}` : shortDay(d.day),
    value: d[measure],
    partial: i === last,
    none: first !== null && d.day < first,
  }))
  const total = data.days.reduce((sum, d) => sum + d[measure], 0)
  return (
    <ChartCard
      title={measure === 'orders' ? 'Orders per day' : 'Sign-ups per day'}
      summary={`${plural(total, word)} in 30 days`}
      points={points}
      unit={(n) => plural(n, word)}
      daily
      empty={measure === 'orders' ? 'No orders in these 30 days' : 'No sign-ups in these 30 days'}
    />
  )
}

function Numbers({ data }: { data: AdminOverview }) {
  // Today in Phnom Penh, as the API counts it.
  const today = data.days.at(-1)?.day ?? ''
  const month = monthName(today.slice(0, 7)).split(' ')[0]
  const { shops } = data
  const unpaid = data.needs.filter((n) => n.kind === 'unpaid').length
  const ending = data.needs.filter((n) => n.kind === 'ending').length
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Shops" value={shops.total}>
        <span className="block">
          <span className="whitespace-nowrap">{shops.paying} paying</span> · <span className="whitespace-nowrap">{shops.trial} on trial</span> ·{' '}
          <span className="whitespace-nowrap">{shops.setup} in setup</span>
        </span>
        {(ending > 0 || unpaid > 0 || shops.stopped > 0 || shops.closed > 0) && (
          <span className="block">
            {[
              ending > 0 && <span key="ending" className="whitespace-nowrap text-amber-700">{ending} ending soon</span>,
              unpaid > 0 && <span key="unpaid" className="whitespace-nowrap text-red-700">{unpaid} unpaid</span>,
              shops.stopped > 0 && <span key="stopped" className="whitespace-nowrap text-red-700">{shops.stopped} stopped</span>,
              shops.closed > 0 && <span key="closed" className="whitespace-nowrap">{shops.closed} closed</span>,
            ]
              .filter(Boolean)
              .flatMap((part, i) => (i === 0 ? [part] : [' · ', part]))}
          </span>
        )}
      </Tile>
      <Tile label={`Collected in ${month}`} value={usd(data.collected_month)}>
        {plural(data.payments_month, 'payment')} · {today.slice(0, 4)}: {usd(data.collected_year)}
      </Tile>
      <Tile label="If all renew" value={usd(data.monthly_income)}>
        a month: each paying shop's last plan, a year's / 12
      </Tile>
      <Tile label="Orders today" value={data.orders_today}>
        {data.orders_week} in 7 days
      </Tile>
    </div>
  )
}

export function Tile({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <Card className="mx-0 rounded-2xl p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 tabular-nums">{children}</p>
    </Card>
  )
}

// The bell's notices about the system itself, listed under the shops.
const SYSTEM_KINDS = new Set<AdminNotice['kind']>(['job_failed', 'job_late', 'backup_failed', 'backup_late', 'errors', 'server_hours', 'database_compute'])
const TONE: Record<AdminNotice['severity'], string> = {
  action: 'text-navy-700',
  urgent: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-slate-500',
}

function Needs({ data }: { data: AdminOverview }) {
  const notices = useAdminNotices()
  const system = (notices.data?.items ?? []).filter((n) => SYSTEM_KINDS.has(n.kind))
  const count = data.needs.length + (data.telegram_failed > 0 ? 1 : 0) + system.length
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
                    <span className="block font-medium break-words text-slate-900">{need.name}</span>
                    <NeedText need={need} />
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
            {system.map((notice) => (
              <li key={notice.key}>
                <Link
                  to={notice.href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
                >
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Activity className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words text-slate-900">{notice.title}</span>
                    <span className={`block text-sm ${TONE[notice.severity]}`}>{notice.text}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
            {data.telegram_failed > 0 && (
              <li>
                <Link
                  to="/admin/system#bot"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
                >
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Send className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">Telegram</span>
                    <span className="block text-sm text-amber-700">{plural(data.telegram_failed, 'message')} failed in 24 hours</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
                </Link>
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
  const nextDay = need.day ? shortDay(addDays(need.day)) : ''
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

