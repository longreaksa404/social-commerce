import { Home, Inbox, LogOut, Menu, Package, ScrollText, Store, Users, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, useLocation } from 'react-router'
import { OakMark } from '../components/OakMark.tsx'
import { ErrorState, PageOutlet, Spinner } from '../components/ui.tsx'
import { formatPhone } from '../lib/orders.ts'
import { useAdminMe } from './queries.ts'
import { SearchBox } from './Search.tsx'
import { useAdminSession } from './useAdminSession.ts'

// The admin panel's places (founder's pick 1A, 2026-10-28): the menu on the
// left on a laptop, where the admin is mostly used; the first four in a
// bottom bar on a phone, the rest under More. More places join as they're
// built (04_STATUS.md, "Admin panel").
const places: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/shops', label: 'Shops', icon: Store },
  { to: '/admin/people', label: 'People', icon: Users },
  { to: '/admin/money', label: 'Money', icon: Wallet },
  { to: '/admin/orders', label: 'Orders', icon: Inbox },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/log', label: 'Log', icon: ScrollText },
]
const TAB_COUNT = 4

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
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:mx-0 lg:max-w-7xl lg:px-8 lg:pt-5 lg:pb-10">
          <div className="mb-3 hidden justify-end lg:flex">
            <SearchBox wide />
          </div>
          <PageOutlet depth={3} />
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

/** "Oak Order" and the word Admin, so it never looks like a shop. */
function AdminBrand() {
  return (
    <span className="flex items-center gap-2">
      <OakMark className="h-6 w-auto text-navy-700" />
      <span className="font-semibold text-slate-900">Oak Order</span>
      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Admin</span>
    </span>
  )
}

function navClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`
}

function Sidebar() {
  const { logOut } = useAdminSession()
  const me = useAdminMe()
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <AdminBrand />
      </div>
      <nav aria-label="Admin" className="flex flex-col gap-1 p-3">
        {places.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(isActive)}>
            <Icon aria-hidden className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-100 p-3">
        <button type="button" onClick={() => void logOut()} className={`${navClass(false)} w-full`}>
          <LogOut aria-hidden className="size-5" />
          <span className="min-w-0 text-left">
            Log out
            {me.data && <span className="block text-xs font-normal text-slate-500 tabular-nums">{formatPhone(me.data.phone)}</span>}
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
        <AdminBrand />
        <SearchBox />
      </div>
    </header>
  )
}

function BottomBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { logOut } = useAdminSession()
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
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-navy-50' : ''}`}>
                    <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
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
              <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={({ isActive }) => navClass(isActive)}>
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            ))}
            <button type="button" onClick={() => void logOut()} className={`${navClass(false)} w-full`}>
              <LogOut aria-hidden className="size-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
