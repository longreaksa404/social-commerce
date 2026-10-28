import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass, cardClass } from '../components/styles.ts'
import { Badge, Button, ErrorMessage, ErrorState, Field, Input, Section, Skeleton } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminShopDetail, PlanPayment, PlanPeriod } from '../lib/types.ts'
import { ShopLogo, StageWords } from './AdminShops.tsx'
import { useAdminShop, useCheckClaim, useMarkPaid } from './queries.ts'
import { ago, date, day, shortDay } from './shared.ts'

const usd = (amount: string | number) => formatMoney(amount, 'USD')

const TABS = ['overview', 'plan', 'people', 'activity'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = { overview: 'Overview', plan: 'Plan', people: 'People', activity: 'Activity' }

/** One shop (founder's picks 5A and 5D, 2026-10-28): who it is and what's
 * wrong at the top with its actions, then Overview, Plan (its "I've paid"
 * to check, Mark paid, every payment), People and Activity. Beside the
 * list on a laptop; its own page on a phone. More actions come with the
 * admin panel's later steps (04_STATUS.md, "Admin panel"). */
export function AdminShop({ storeId }: { storeId: string }) {
  const shop = useAdminShop(storeId)
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="min-w-0">
      <Link to="/admin/shops" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-navy-700 lg:hidden">
        <ChevronLeft aria-hidden className="size-4" />
        Shops
      </Link>
      {shop.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : shop.error ? (
        <ErrorState error={shop.error} onRetry={() => shop.refetch()} />
      ) : (
        <>
          <title>{`${shop.data.name} · Oak Order admin`}</title>
          <Header shop={shop.data} onCheck={() => setTab('plan')} />
          <div role="tablist" aria-label={shop.data.name} className="mt-5 mb-4 flex gap-5 border-b border-slate-200">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px min-h-11 border-b-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-600 ${
                  tab === key ? 'border-navy-700 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {TAB_LABEL[key]}
                {key === 'plan' && shop.data.claim && <span className="ml-1.5 text-navy-700">1</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="space-y-6">
            {tab === 'overview' && <Overview shop={shop.data} />}
            {tab === 'plan' && (
              <>
                {shop.data.claim && <CheckClaim shop={shop.data} claim={shop.data.claim} />}
                <MarkPaid shop={shop.data} />
                <Payments shop={shop.data} />
              </>
            )}
            {tab === 'people' && <People shop={shop.data} />}
            {tab === 'activity' && <Activity shop={shop.data} />}
          </div>
        </>
      )}
    </div>
  )
}

function Header({ shop, onCheck }: { shop: AdminShopDetail; onCheck: () => void }) {
  return (
    <div className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <ShopLogo shop={shop} size="size-12" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{shop.name}</h1>
          <p className="truncate text-sm text-slate-500">
            <span className="font-mono font-semibold text-slate-700">{shop.code}</span> · /shop/{shop.slug}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        <StageWords shop={shop} />
        {shop.is_open && shop.paid_until && shop.stage !== 'overdue' && shop.stage !== 'ending_soon' && (
          <span className="text-slate-500"> · paid until {shortDay(shop.paid_until)}</span>
        )}
        {shop.stage === 'overdue' && <span className="text-red-700"> · orders stop after that</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shop.claim && <Button onClick={onCheck}>Check "I've paid"</Button>}
        <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
          <ExternalLink aria-hidden className="size-4" />
          View shop
        </a>
      </div>
    </div>
  )
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={`${cardClass} divide-y divide-slate-100`}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-4 px-4 py-3 text-sm">
          <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
          <dd className="min-w-0 flex-1 text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const PAYS: Record<string, string> = { cod: 'Cash on delivery', khqr: 'KHQR' }
const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

function Overview({ shop }: { shop: AdminShopDetail }) {
  const owner = shop.people.find((p) => p.role === 'owner')
  return (
    <Facts
      rows={[
        ['Owner', `${shop.owner_name} · ${formatPhone(shop.login)}`],
        ['Signed up', date(shop.created_at)],
        ['Currency', shop.currency === 'KHR' ? 'Riel' : 'Dollars'],
        ['Telegram', shop.telegram ? 'Connected' : <span key="telegram" className="text-amber-700">Not connected</span>],
        ['Pays by', shop.payment_set_up ? shop.pays_by.map((m) => PAYS[m] ?? m).join(', ') : <span key="pays" className="text-amber-700">Not set up: cash only</span>],
        ['Delivery', shop.delivery_set_up ? 'Set up' : <span key="delivery" className="text-amber-700">Not set up</span>],
        ['Has', `${count(shop.products, 'product')} · ${count(shop.orders, 'order')} · ${count(shop.customers, 'customer')}`],
        ['Last order', shop.last_order_at ? ago(shop.last_order_at) : 'None yet'],
        ['Owner used the app', owner?.last_seen ? ago(owner.last_seen) : 'Not logged in on any phone now'],
      ]}
    />
  )
}

function People({ shop }: { shop: AdminShopDetail }) {
  return (
    <ul className={`${cardClass} divide-y divide-slate-100`}>
      {shop.people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-slate-900">{person.name}</span>
            <span className="block text-slate-500 tabular-nums">
              {person.role === 'owner' ? 'Owner' : 'Staff'} · {person.phone ? formatPhone(person.phone) : 'email login'}
            </span>
          </span>
          <span className="text-right text-xs text-slate-500">{person.last_seen ? `Used ${ago(person.last_seen)}` : 'Not logged in now'}</span>
        </li>
      ))}
    </ul>
  )
}

const EVENT: Record<string, string> = {
  new_order: 'New order alert',
  low_stock: 'Low stock alert',
  payment_claimed: 'A customer says paid',
  plan_reminder: 'Plan reminder',
  plan_claimed: '"I\'ve paid" to Oak Order',
}

function Activity({ shop }: { shop: AdminShopDetail }) {
  if (shop.activity.length === 0) return <p className="text-sm text-slate-500 sm:px-1">No messages yet.</p>
  return (
    <ul className={`${cardClass} divide-y divide-slate-100`}>
      {shop.activity.map((item, i) => (
        <li key={`${item.sent_at}-${i}`} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-slate-900">{EVENT[item.event_type] ?? item.event_type}</span>
            <span className="block text-slate-500">
              {item.channel === 'telegram' ? 'Telegram' : 'In the app'} · {ago(item.sent_at)}
            </span>
          </span>
          {item.status === 'failed' && <span className="text-sm font-semibold text-amber-700">Failed</span>}
        </li>
      ))}
    </ul>
  )
}

/** The seller said "I've paid": found in the bank (mark paid, the amount
 * found if different) or not (the seller sees the note). */
function CheckClaim({ shop, claim }: { shop: AdminShopDetail; claim: PlanPayment }) {
  const a = useT().admin
  const { confirm, toast } = useFeedback()
  const check = useCheckClaim(shop.id)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const period = claim.period === 'month' ? a.month : a.year

  async function found() {
    const paid = amount.trim() || claim.amount
    const ok = await confirm({ title: a.foundTitle(shop.name), message: a.confirmMessage(usd(paid), period.toLowerCase()), confirmLabel: a.found })
    if (!ok) return
    check.mutate(
      { paymentId: claim.id, found: true, amount: amount.trim() || null, note: note.trim() || null },
      { onSuccess: (updated) => toast(a.marked(day(updated.paid_until))) },
    )
  }

  async function notFound() {
    const why = note.trim() || a.notFoundDefault
    const ok = await confirm({ title: a.notFoundTitle, message: why, confirmLabel: a.notFound, danger: true })
    if (!ok) return
    check.mutate({ paymentId: claim.id, found: false, note: why }, { onSuccess: () => toast(a.checked) })
  }

  return (
    <Section title={a.claim(usd(claim.amount), period.toLowerCase(), date(claim.created_at))} description={a.checkClaim}>
      <p className="font-mono text-2xl font-bold tracking-wide text-slate-900">{shop.code}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={a.amount}>
          <Input type="number" inputMode="decimal" min="0" max="10000" step="0.01" leading="$" placeholder={claim.amount} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={a.note}>
          <Input maxLength={200} placeholder={a.notFoundDefault} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <ErrorMessage error={check.error} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button loading={check.isPending} onClick={found} className="w-full sm:w-auto">
          {a.found}
        </Button>
        <Button variant="secondary" disabled={check.isPending} onClick={notFound} className="w-full sm:w-auto">
          {a.notFound}
        </Button>
      </div>
    </Section>
  )
}

function MarkPaid({ shop }: { shop: AdminShopDetail }) {
  const a = useT().admin
  const { confirm, toast } = useFeedback()
  const mark = useMarkPaid(shop.id)
  const [period, setPeriod] = useState<PlanPeriod>('month')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const price = period === 'month' ? '9.99' : '99.00'

  async function submit(event: FormEvent) {
    event.preventDefault()
    const paid = amount.trim() || price
    const ok = await confirm({
      title: a.confirmTitle(shop.name),
      message: a.confirmMessage(usd(paid), period === 'month' ? a.month : a.year),
      confirmLabel: a.markPaid,
    })
    if (!ok) return
    mark.mutate(
      { period, amount: amount.trim() || null, note: note.trim() || null },
      {
        onSuccess: (updated) => {
          toast(a.marked(day(updated.paid_until)))
          setAmount('')
          setNote('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <Section title={a.markPaid} description={a.markPaidHint}>
        <Field label={a.period}>
          <div role="group" className="flex rounded-xl bg-slate-100 p-0.5">
            {(['month', 'year'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={`min-h-10 flex-1 rounded-[10px] px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                  period === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option === 'month' ? a.month : a.year}
              </button>
            ))}
          </div>
        </Field>
        <Field label={a.amount}>
          <Input type="number" inputMode="decimal" min="0" max="10000" step="0.01" leading="$" placeholder={price} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={a.note}>
          <Input maxLength={200} placeholder={a.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorMessage error={mark.error} />
        <Button type="submit" loading={mark.isPending} className="w-full sm:w-auto">
          {a.markPaid}
        </Button>
      </Section>
    </form>
  )
}

function Payments({ shop }: { shop: AdminShopDetail }) {
  const a = useT().admin
  return (
    <Section title={a.payments}>
      {shop.payments.length === 0 ? (
        <p className="text-sm text-slate-500">{a.noPayments}</p>
      ) : (
        <ul className="-my-3 divide-y divide-slate-100">
          {shop.payments.map((payment) => (
            <li key={payment.id} className="space-y-0.5 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                {usd(payment.amount)} · {payment.period === 'month' ? a.month : a.year}
                <Badge tone={payment.status === 'paid' ? 'green' : payment.status === 'failed' ? 'amber' : 'blue'}>
                  {a.status[payment.status]}
                </Badge>
              </p>
              <p className="text-slate-500">
                {date(payment.created_at)}
                {payment.covers_from && payment.covers_until && ` · ${a.covers(day(payment.covers_from), day(payment.covers_until))}`}
              </p>
              {payment.failure && <p className="text-amber-800">{payment.failure}</p>}
              {payment.reference && <p className="text-slate-600">{payment.reference}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
