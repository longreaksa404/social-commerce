import {
  Activity,
  Bot,
  ChartColumn,
  ContactRound,
  Home,
  Inbox,
  LogOut,
  Menu,
  Package,
  ScrollText,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, useLocation } from 'react-router'
import { OakMark, OakOrderName } from '../components/OakMark.tsx'
import { ErrorState, PageOutlet, Spinner } from '../components/ui.tsx'
import { formatPhone } from '../lib/orders.ts'
import { NoticeBell } from './Notices.tsx'
import { useAdminMe, useAdminNotices } from './queries.ts'
import { SearchBox } from './Search.tsx'
import { useAdminSession } from './useAdminSession.ts'

type Place = { to: string; label: string; icon: LucideIcon; end?: boolean }

// The admin panel's places, in the admin brief's order (2026-11-06), in
// three groups (founder's pick 1A, 2026-11-06): running the shops and the
// money, looking things up in every shop, and Oak Order itself. The first
// four are the phone's bottom bar, the rest under More. Search and the
// bell are on each page's title row (AdminPageHeader), not in the menu.
const GROUPS: { label: string | null; places: Place[] }[] = [
  {
    label: null,
    places: [
      { to: '/admin', label: 'Home', icon: Home, end: true },
      { to: '/admin/shops', label: 'Shops', icon: Store },
      { to: '/admin/people', label: 'People', icon: Users },
      { to: '/admin/money', label: 'Money', icon: Wallet },
      { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
    ],
  },
  {
    label: 'Look up',
    places: [
      { to: '/admin/orders', label: 'Orders', icon: Inbox },
      { to: '/admin/customers', label: 'Customers', icon: ContactRound },
      { to: '/admin/products', label: 'Products', icon: Package },
    ],
  },
  {
    label: 'Platform',
    places: [
      { to: '/admin/bot', label: 'Bot', icon: Bot },
      { to: '/admin/system', label: 'System', icon: Activity },
      { to: '/admin/log', label: 'Log', icon: ScrollText },
      { to: '/admin/tools', label: 'Tools', icon: Wrench },
      { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
]
const places = GROUPS.flatMap((group) => group.places)
const TAB_COUNT = 4

/** How many "I've paid" wait to be checked, from the bell's notices: a
 * number beside Money in the menu (pick 1A). */
function useWaitingClaims() {
  const notices = useAdminNotices()
  return (notices.data?.items ?? []).filter((n) => n.kind === 'claim').length
}

/** The admin panel's shell, and its login guard (English only, D5A). */
export function AdminLayout() {
  const { status, restoreError, retry } = useAdminSession()
  const location = useLocation()
  if (status === 'loading') return <Spinner />
  if (status === 'unreachable') {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <ErrorState error={restoreError} onRetry={retry} />
      </div>
    )
  }
  if (status === 'out') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <MobileTopBar />
      <div className="min-w-0 lg:flex-1">
        {/* No width cap on a laptop (pick 1A): lists and tables use the
            screen; forms keep their own reading width. */}
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:max-w-none lg:px-6 lg:pt-5 lg:pb-10 xl:px-8">
          <PageOutlet depth={3} />
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

function Count({ n, className = '' }: { n: number; className?: string }) {
  if (n === 0) return null
  return (
    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white tabular-nums ${className}`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

// From 1280px the full menu; from 1024 to 1279px a slim rail, icons with
// their names under them, as the seller app (pick 3A there): the page
// beside it gets the width.
function navClass(isActive: boolean) {
  return `relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 max-xl:flex-col max-xl:gap-0.5 max-xl:px-1 max-xl:py-1 max-xl:text-center max-xl:text-[11px] max-xl:leading-tight ${
    isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`
}

function Sidebar() {
  const { logOut } = useAdminSession()
  const me = useAdminMe()
  const waiting = useWaitingClaims()
  return (
    <aside className="sticky top-0 hidden h-dvh w-22 shrink-0 flex-col border-r border-slate-200 bg-surface lg:flex xl:w-58">
      <div className="flex min-h-16 items-center gap-2 border-b border-slate-100 px-5 max-xl:min-h-14 max-xl:justify-center max-xl:px-0">
        <OakMark className="h-7 w-auto text-navy-700 xl:hidden" />
        <span className="sr-only xl:hidden">Oak Order admin</span>
        <span className="flex items-baseline gap-2 max-xl:hidden">
          <OakOrderName className="text-lg text-slate-900" oClassName="text-navy-700" />
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Admin</span>
        </span>
      </div>
      <nav aria-label="Admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 max-xl:p-1.5">
        {GROUPS.map((group, i) => (
          <div key={group.label ?? 'main'} className={i > 0 ? 'mt-3 border-slate-100 max-xl:mt-1.5 max-xl:border-t max-xl:pt-1.5' : ''}>
            {group.label && <p className="px-3 pb-1 text-xs font-semibold text-slate-400 max-xl:sr-only">{group.label}</p>}
            <div className="flex flex-col gap-0.5">
              {group.places.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(isActive)}>
                  <Icon aria-hidden className="size-5 shrink-0" />
                  <span className="min-w-0">{label}</span>
                  {to === '/admin/money' && waiting > 0 && (
                    <>
                      <Count n={waiting} className="ml-auto max-xl:absolute max-xl:top-0.5 max-xl:right-2.5" />
                      <span className="sr-only">, {waiting} waiting</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3 max-xl:p-1.5">
        <button type="button" onClick={() => void logOut()} className={`${navClass(false)} w-full`}>
          <LogOut aria-hidden className="size-5 shrink-0" />
          <span className="min-w-0 text-left max-xl:text-center">
            Log out
            {me.data && <span className="block text-xs font-normal text-slate-500 tabular-nums max-xl:hidden">{formatPhone(me.data.phone)}</span>}
          </span>
        </button>
      </div>
    </aside>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between pr-2 pl-4">
        <span className="flex items-baseline gap-2">
          <OakOrderName className="text-lg text-slate-900" oClassName="text-navy-700" />
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Admin</span>
        </span>
        <div className="flex items-center">
          <SearchBox />
          <NoticeBell />
        </div>
      </div>
    </header>
  )
}

function BottomBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { logOut } = useAdminSession()
  const waiting = useWaitingClaims()
  const tabs = places.slice(0, TAB_COUNT)
  const more = places.slice(TAB_COUNT)
  return (
    <>
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-navy-700' : 'text-slate-500'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-navy-50' : ''}`}>
                    <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    {to === '/admin/money' && <Count n={waiting} className="absolute -top-1 right-1" />}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-500"
          >
            <span className="flex h-8 w-14 items-center justify-center">
              <Menu aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            More
          </button>
        </div>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-900/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-label="More"
            className="w-full animate-sheet-up rounded-t-3xl bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            {more.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600'}`
                }
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            ))}
            <button type="button" onClick={() => void logOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600">
              <LogOut aria-hidden className="size-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
