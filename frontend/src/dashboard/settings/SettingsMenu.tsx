import {
  Bell,
  ChevronRight,
  DoorClosed,
  Download,
  ExternalLink,
  Inbox,
  LifeBuoy,
  MessageCircle,
  Link2,
  ListChecks,
  LogOut,
  Store as StoreIcon,
  Tag,
  Truck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorState, PageHeader, Section, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { LanguageSwitch } from '../../i18n/LanguageSwitch.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatCalendarDay, formatPhone } from '../../lib/orders.ts'
import { PAYMENT_METHOD_ORDER } from '../../lib/payments.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../../lib/support.ts'
import type { Store } from '../../lib/types.ts'
import { ThemeSwitch } from '../../theme/ThemeSwitch.tsx'
import { useAccount, useStore } from '../queries.ts'
import { SECTIONS, type PageId, type SectionId } from './form.ts'
import { useSetup } from './setup.ts'

const ROWS: { id: Exclude<SectionId, 'shop'>; icon: LucideIcon }[] = [
  { id: 'orders', icon: Inbox },
  { id: 'payments', icon: Wallet },
  { id: 'delivery', icon: Truck },
  { id: 'discounts', icon: Tag },
  { id: 'contact', icon: MessageCircle },
  { id: 'telegram', icon: Bell },
  { id: 'link', icon: Link2 },
]

/** /dashboard/settings: one row per part of the shop's settings, each
 * saying what's set now and opening its own page. Language, theme and
 * log out work right here. */
type Selected = SectionId | PageId

/** `selected`: the setting open beside the menu (laptops). */
export function SettingsMenu({ selected }: { selected?: Selected }) {
  const store = useStore()
  const account = useAccount()
  const role = account.data?.role
  const t = useT()
  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="space-y-6">
        {store.isPending || account.isPending ? (
          <div className="space-y-6">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : store.error || account.error ? (
          <ErrorState
            error={store.error ?? account.error}
            onRetry={() => {
              store.refetch()
              account.refetch()
            }}
          />
        ) : role === 'owner' ? (
          <StoreRows store={store.data} selected={selected} />
        ) : (
          // Staff: everything but Settings (founder's choice 2026-10-08).
          <Card className="px-4 py-3.5 text-sm leading-6 text-slate-600">{t.settings.staffNoSettings(store.data.name)}</Card>
        )}
        <AccountRows selected={selected} store={store.data} owner={role === 'owner'} />
        <DisplaySection />
        <LogOutButton />
      </div>
    </>
  )
}

function StoreRows({ store, selected }: { store: Store; selected?: Selected }) {
  const t = useT()
  const s = t.settings
  const summary = summaries(store, t)
  const setup = useSetup()
  return (
    <>
      {/* A new shop's checklist (founder's pick 7C), until it's done. */}
      {setup?.show && (
        <Card>
          <MenuRow
            to="setup"
            selected={selected === 'setup'}
            icon={
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <ListChecks aria-hidden className="size-6" />
                {setup.needsAttention && (
                  <span aria-hidden className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-surface bg-amber-500" />
                )}
              </span>
            }
            title={s.setup.title}
            summary={s.setup.progress(setup.done, setup.steps.length)}
          />
        </Card>
      )}
      <Card>
        <MenuRow
          to="shop"
          selected={selected === 'shop'}
          icon={
            store.logo_url ? (
              <img src={store.logo_url} alt="" className="size-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <StoreIcon aria-hidden className="size-6" />
              </span>
            )
          }
          title={store.name}
          summary={s.menu.shopHint}
        />
      </Card>
      <section aria-labelledby="selling">
        <h2 id="selling" className="mb-2 sm:px-1 text-sm font-semibold text-slate-500">
          {s.menu.selling}
        </h2>
        <Card>
          <ul className="divide-y divide-slate-100">
            {ROWS.map(({ id, icon: Icon }) => (
              <li key={id}>
                <MenuRow
                  to={id}
                  selected={selected === id}
                  icon={<RowIcon icon={Icon} />}
                  title={SECTIONS[id].title(s)}
                  summary={summary[id]}
                />
              </li>
            ))}
            <li>
              <MenuRow
                to="export"
                selected={selected === 'export'}
                icon={<RowIcon icon={Download} />}
                title={s.exportOrders}
                summary={s.menu.exportHint}
              />
            </li>
          </ul>
        </Card>
      </section>
    </>
  )
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
      <Icon aria-hidden className="size-4.5" />
    </span>
  )
}

/** A row opening one setting; with `href`, a page outside the app in a
 * new tab instead. */
function MenuRow({
  to,
  href,
  icon,
  title,
  summary,
  selected = false,
}: {
  to?: string
  href?: string
  icon: ReactNode
  title: string
  summary: string
  selected?: boolean
}) {
  const className = `flex min-h-16 items-center gap-3 px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100 sm:[:not(li)>&]:rounded-2xl sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl ${
    selected ? 'lg:bg-navy-50' : 'hover:bg-slate-50'
  }`
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{title}</span>
        <span className="mt-0.5 line-clamp-2 text-sm text-slate-500">{summary}</span>
      </span>
      {href ? (
        <ExternalLink aria-hidden className="size-4.5 shrink-0 text-slate-400" />
      ) : (
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
      )}
    </>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    )
  }
  return (
    // From the menu's own address, so it works beside an open setting too.
    <Link to={`/dashboard/settings/${to}`} aria-current={selected ? 'page' : undefined} className={className}>
      {content}
    </Link>
  )
}

/** What each row says is set now. */
function summaries(store: Store, t: Messages): Record<Exclude<SectionId, 'shop'>, string> {
  const m = t.settings.menu
  const money = (amount: string) => formatMoney(amount, store.currency)
  const { payment_settings: payments, delivery_settings: delivery } = store

  const methods = PAYMENT_METHOD_ORDER.filter((method) => payments[method].enabled)
  const delivers = delivery.own_delivery.enabled || delivery.couriers.length > 0
  const deliveryParts = [
    ...(delivers
      ? Number(delivery.fee) > 0
        ? [m.deliveryFee(money(delivery.fee)), ...(delivery.free_from_amount ? [m.freeFrom(money(delivery.free_from_amount))] : [])]
        : [m.freeDelivery]
      : []),
    ...(delivery.pickup.enabled ? [t.settings.pickup] : []),
  ]
  const rules = [...store.discount_settings.rules].sort((a, b) => Number(a.min_subtotal) - Number(b.min_subtotal))

  return {
    orders: store.orders_paused
      ? store.orders_resume_on
        ? m.pausedUntil(formatCalendarDay(store.orders_resume_on))
        : m.paused
      : store.order_confirmation_mode === 'automatic'
        ? m.autoOn
        : m.autoOff,
    payments: methods.map((method) => t.status.paymentMethod[method]).join(', ') || m.noneOn,
    delivery: store.delivery_set_up ? deliveryParts.join(' · ') || m.noneOn : m.deliveryNotSet,
    discounts: rules.map((r) => m.discount(money(r.amount_off), money(r.min_subtotal))).join(' · ') || m.none,
    contact:
      [
        ...(store.telegram_username ? ['Telegram'] : []),
        ...(store.messenger_username ? ['Messenger'] : []),
        ...(store.contact_phone ? [formatPhone(store.contact_phone)] : []),
      ].join(', ') || m.none,
    telegram: `${m.lowStockAt(store.low_stock_alert)} · ${store.telegram_connected ? m.telegramOn : m.telegramOff}`,
    link: `/shop/${store.slug}`,
  }
}

/** Applies at once and stays on this device; not part of the store's settings. */
function DisplaySection() {
  const s = useT().settings
  return (
    <Section title={s.display} description={s.displayHint}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-slate-900">{s.language}</span>
        <LanguageSwitch />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-slate-900">{s.theme}</span>
        <ThemeSwitch />
      </div>
    </Section>
  )
}

/** The person's own things, apart from the store's settings. */
function AccountRows({ selected, store, owner }: { selected?: Selected; store?: Store; owner: boolean }) {
  const s = useT().settings
  const rows: { id: PageId | 'help'; href?: string; icon: LucideIcon; title: string; summary: string }[] = [
    { id: 'account', icon: UserRound, title: s.yourAccount, summary: s.menu.accountHint },
  ]
  if (owner) rows.push({ id: 'staff', icon: Users, title: s.staff, summary: s.menu.staffHint })
  if (SUPPORT_TELEGRAM) {
    const shop = store ? s.supportText(store.name, `${location.origin}/shop/${store.slug}`) : s.supportTextNoShop
    rows.push({ id: 'help', href: supportLink(shop), icon: LifeBuoy, title: s.help, summary: s.menu.helpHint })
  }
  if (owner) rows.push({ id: 'close', icon: DoorClosed, title: s.closeShop, summary: s.menu.closeHint })
  return (
    <section aria-labelledby="account">
      <h2 id="account" className="mb-2 sm:px-1 text-sm font-semibold text-slate-500">
        {s.account}
      </h2>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map(({ id, href, icon, title, summary }) => (
            <li key={id}>
              <MenuRow
                to={href ? undefined : id}
                href={href}
                selected={selected === id}
                icon={<RowIcon icon={icon} />}
                title={title}
                summary={summary}
              />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}

/** Asks first, so a stray tap doesn't log the seller out mid-day. */
function LogOutButton() {
  const { logout } = useAuth()
  const { confirm } = useFeedback()
  const s = useT().settings
  async function confirmLogOut() {
    const ok = await confirm({ title: s.logOutConfirmTitle, message: s.logOutConfirmMessage, confirmLabel: s.logOut })
    if (ok) await logout()
  }
  return (
    <Button variant="secondary" icon={LogOut} onClick={confirmLogOut} className="w-full sm:w-auto">
      {s.logOut}
    </Button>
  )
}
