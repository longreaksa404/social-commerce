import { ChevronLeft, ExternalLink, Lock } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass, cardClass } from '../components/styles.ts'
import { Badge, Button, ErrorMessage, ErrorState, Field, Input, MenuButton, Section, Skeleton, TextArea } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { errorText } from '../lib/errors.ts'
import { formatMoney } from '../lib/money.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminShopDetail, PlanPayment, PlanPeriod } from '../lib/types.ts'
import { DayList } from './AdminLog.tsx'
import { logItem, type DayItem } from './logWords.ts'
import { ShopLogo, StageWords } from './AdminShops.tsx'
import { useAdminShop, useCheckClaim, useMarkPaid, useSetShopOpen } from './queries.ts'
import { ago, date, day, shortDay } from './shared.ts'
import { Sheet } from './ui.tsx'

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
  const [closing, setClosing] = useState(false)
  return (
    <div className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <ShopLogo shop={shop} size="size-12" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{shop.name}</h1>
          <p className="truncate text-sm text-slate-500">
            <span className="font-semibold tracking-wide text-slate-700">{shop.code}</span> · /shop/{shop.slug}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        <StageWords shop={shop} />
        {!shop.is_open && (
          <span className="text-slate-500">
            {shop.closed_at ? ` ${new Date(shop.closed_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : ' by the seller'}
            {shop.closed_reason && ` · ${shop.closed_reason}`}
          </span>
        )}
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
        {shop.is_open ? (
          <MenuButton label="More" items={[{ label: 'Close shop', icon: Lock, danger: true, onSelect: () => setClosing(true) }]} />
        ) : (
          <Reopen shop={shop} />
        )}
      </div>
      <CloseShop shop={shop} open={closing} onClose={() => setClosing(false)} />
    </div>
  )
}

/** Close (part 5) asks why, for the log: the link stops and every login
 * of the shop is logged out; nothing is erased. */
function CloseShop({ shop, open, onClose }: { shop: AdminShopDetail; open: boolean; onClose: () => void }) {
  const { toast } = useFeedback()
  const close = useSetShopOpen(shop.id)
  const [reason, setReason] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    close.mutate(
      { open: false, reason: reason.trim() },
      {
        onSuccess: () => {
          toast(`${shop.name} closed · in the log`)
          setReason('')
          onClose()
        },
      },
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Close ${shop.name}?`}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-6 text-slate-600">The link stops and the owner and staff are logged out. Nothing is erased.</p>
        <Field label="Why" className="mt-4">
          <TextArea rows={2} maxLength={300} required placeholder="Seller asked: rainy season" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <ErrorMessage error={close.error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={close.isPending} disabled={!reason.trim()}>
            Close shop
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

function Reopen({ shop }: { shop: AdminShopDetail }) {
  const { confirm, toast } = useFeedback()
  const reopen = useSetShopOpen(shop.id)

  async function ask() {
    const ok = await confirm({ title: `Reopen ${shop.name}?`, message: 'Its link and logins work again.', confirmLabel: 'Reopen' })
    if (!ok) return
    reopen.mutate({ open: true, reason: null }, { onSuccess: () => toast(`${shop.name} reopened`), onError: (error) => toast(errorText(error), 'error') })
  }

  return (
    <Button variant="secondary" loading={reopen.isPending} onClick={ask}>
      Reopen
    </Button>
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

/** A shop's Activity (part 6): the messages it was sent (alerts, plan
 * reminders, failed ones amber) and what Oak Order did on it, from the
 * log, in one list a day at a time. */
function Activity({ shop }: { shop: AdminShopDetail }) {
  const items: DayItem[] = [
    ...shop.log.map((line) => logItem(line, false)),
    ...shop.activity.map((item, i) => ({
      id: `message-${i}`,
      at: item.sent_at,
      title: EVENT[item.event_type] ?? item.event_type,
      lines: [item.channel === 'telegram' ? 'Telegram' : 'In the app'],
      warn: item.status === 'failed' ? 'Failed' : undefined,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  if (items.length === 0) return <p className="text-sm text-slate-500 sm:px-1">Nothing yet.</p>
  return <DayList items={items} />
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
      <p className="text-2xl font-bold tracking-wide text-slate-900">{shop.code}</p>
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
