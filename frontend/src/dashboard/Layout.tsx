import { Bell, Inbox, Link2, Package, Settings, Store, Tags, Users } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation, useMatch } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Skeleton, Spinner } from '../components/ui.tsx'
import { useStore, useUnreadNotifications } from './queries.ts'

// Five tabs fit a 320px phone. Categories is a button on Products there,
// and its own entry in the wider sidebar.
const tabs = [
  { to: '/dashboard/orders', label: 'Orders', icon: Inbox },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/links', label: 'Links', icon: Link2 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]
const sidebarLinks = [...tabs.slice(0, 3), { to: '/dashboard/categories', label: 'Categories', icon: Tags }, ...tabs.slice(3)]

/** Dashboard shell; also the login guard for everything under /dashboard. */
export function DashboardLayout() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Shell />
}

function Shell() {
  // Product create/edit and an order are focused task screens on phones:
  // no app bar or tab bar; the page brings its own back button and a
  // pinned bar with its buttons.
  const productScreen = useMatch('/dashboard/products/:productId') !== null
  const orderScreen = useMatch('/dashboard/orders/:orderId') !== null
  const focused = productScreen || orderScreen

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      {!focused && <MobileTopBar />}
      <main
        className={`mx-auto w-full max-w-3xl px-4 lg:px-8 lg:py-8 ${
          focused ? 'pt-2 pb-28 lg:pb-8' : 'pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-8'
        }`}
      >
        <Outlet />
      </main>
      {!focused && <BottomTabBar />}
    </div>
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
  return (
    <NavLink
      to="/dashboard/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className={({ isActive }) =>
        `relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${
          isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Bell aria-hidden className="size-5.5" />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2.5 pr-2 pl-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store aria-hidden className="size-4.5" />
        </span>
        <StoreName />
        <NotificationBell />
      </div>
    </header>
  )
}

function BottomTabBar() {
  const onCategories = useMatch('/dashboard/categories') !== null
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 active:text-slate-900'
              }`
            }
          >
            {({ isActive: onTab }) => {
              // Categories lives under the Products tab on phones.
              const isActive = onTab || (onCategories && to === '/dashboard/products')
              return (
              <>
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-emerald-50' : ''
                  }`}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                {label}
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
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 pr-3 pl-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store aria-hidden className="size-4.5" />
        </span>
        <StoreName />
        <NotificationBell />
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1 p-3">
        {sidebarLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
