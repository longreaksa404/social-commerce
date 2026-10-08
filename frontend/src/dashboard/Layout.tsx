import { Bell, Inbox, Link2, Package, Settings, Store, Tags, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, useLocation, useMatch } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { PageOutlet, Skeleton, Spinner } from '../components/ui.tsx'
import { useBump } from '../components/useBump.ts'
import type { Messages } from '../i18n/core.ts'
import { useT } from '../i18n/useT.ts'
import { useStore, useUnreadNotifications } from './queries.ts'

// Five tabs fit a 320px phone. Categories is a button on Products there,
// and its own entry in the wider sidebar.
const tabs = [
  { to: '/dashboard/orders', key: 'orders', icon: Inbox },
  { to: '/dashboard/customers', key: 'customers', icon: Users },
  { to: '/dashboard/products', key: 'products', icon: Package },
  { to: '/dashboard/links', key: 'links', icon: Link2 },
  { to: '/dashboard/settings', key: 'settings', icon: Settings },
] as const
const sidebarLinks = [...tabs.slice(0, 3), { to: '/dashboard/categories', key: 'categories', icon: Tags } as const, ...tabs.slice(3)]

const tabLabel = (t: Messages, key: (typeof sidebarLinks)[number]['key']) => t.dashboard.tab[key]

/** Dashboard shell; also the login guard for everything under /dashboard. */
export function DashboardLayout() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Shell />
}

function Shell() {
  // Product create/edit, an order and a settings page are focused task
  // screens on phones: no app bar or tab bar; the page brings its own back
  // button and a pinned bar with its buttons.
  const productScreen = useMatch('/dashboard/products/:productId') !== null
  const orderScreen = useMatch('/dashboard/orders/:orderId') !== null
  // Laptops: the order list with the open order beside it needs the width.
  const ordersList = useMatch('/dashboard/orders') !== null
  const ordersArea = orderScreen || ordersList
  // Laptops: the products grid and table use the width too.
  const productsList = useMatch('/dashboard/products') !== null
  const customersList = useMatch('/dashboard/customers') !== null
  const settingsScreen = useMatch('/dashboard/settings/:section') !== null
  const focused = productScreen || orderScreen || settingsScreen

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      {!focused && <MobileTopBar />}
      <main
        className={`mx-auto w-full px-4 lg:px-8 lg:py-8 ${ordersArea || productsList ? 'max-w-3xl lg:max-w-7xl' : customersList ? 'max-w-3xl lg:max-w-5xl' : 'max-w-3xl'} ${
          focused ? 'pt-2 pb-28 lg:pb-8' : 'pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-8'
        }`}
      >
        <PageOutlet depth={2} />
      </main>
      {!focused && <BottomTabBar />}
    </div>
  )
}

/** The shop's logo, round as customers see it, or a plain shop icon (also
 * when the logo won't load). */
function StoreMark() {
  const logo = useStore().data?.logo_url
  const [failed, setFailed] = useState<string | null>(null)
  if (logo && failed !== logo) {
    return <img src={logo} alt="" onError={() => setFailed(logo)} className="size-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
      <Store aria-hidden className="size-4.5" />
    </span>
  )
}

/** Takes the room left in its bar, cut short with "…" if it needs more. */
function StoreName() {
  const store = useStore()
  return (
    <div className="min-w-0 flex-1">
      {store.data ? (
        <span className="block truncate font-semibold text-slate-900">{store.data.name}</span>
      ) : (
        <Skeleton className="h-5 w-32" />
      )}
    </div>
  )
}

/** New orders and low stock since the seller last looked, on any device. */
function NotificationBell() {
  const unread = useUnreadNotifications().data ?? 0
  // Rings each time the count goes up (a new order, low stock).
  const rings = useBump(unread, (before, now) => now > before)
  const t = useT()
  return (
    <NavLink
      to="/dashboard/notifications"
      aria-label={unread > 0 ? t.dashboard.notificationsUnread(unread) : t.dashboard.notifications}
      className={({ isActive }) =>
        `relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-navy-600 ${
          isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Bell key={rings} aria-hidden className={`size-5.5 ${rings ? 'origin-top animate-wiggle' : ''}`} />
      {unread > 0 && (
        <span
          key={`count-${rings}`}
          aria-hidden
          className={`absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white ring-2 ring-surface ${rings ? 'animate-pop' : ''}`}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2.5 pr-2 pl-4">
        <StoreMark />
        <StoreName />
        <NotificationBell />
      </div>
    </header>
  )
}

function BottomTabBar() {
  const onCategories = useMatch('/dashboard/categories') !== null
  const t = useT()
  return (
    <nav
      aria-label={t.dashboard.mainNav}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-navy-700' : 'text-slate-500 active:text-slate-900'
              }`
            }
          >
            {({ isActive: onTab }) => {
              // Categories lives under the Products tab on phones.
              const isActive = onTab || (onCategories && to === '/dashboard/products')
              return (
              <>
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {/* Grows into the tab just opened, shrinks out of the last. */}
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-navy-50 transition duration-300 ease-out ${
                      isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                  />
                  <Icon aria-hidden className="relative size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                {tabLabel(t, key)}
              </>
              )
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Sidebar() {
  const t = useT()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 pr-3 pl-5">
        <StoreMark />
        <StoreName />
        <NotificationBell />
      </div>
      <nav aria-label={t.dashboard.mainNav} className="flex flex-col gap-1 p-3">
        {sidebarLinks.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon aria-hidden className="size-5" />
            {tabLabel(t, key)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
