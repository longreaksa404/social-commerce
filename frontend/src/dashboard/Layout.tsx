import { Inbox, Package, Settings, Store, Tags } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation, useMatch } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Skeleton, Spinner } from '../components/ui.tsx'
import { useStore } from './queries.ts'

const links = [
  { to: '/dashboard/orders', label: 'Orders', icon: Inbox },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/categories', label: 'Categories', icon: Tags },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

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

function StoreName({ className = '' }: { className?: string }) {
  const store = useStore()
  if (!store.data) return <Skeleton className={`h-5 w-32 ${className}`} />
  return <span className={`truncate font-semibold text-slate-900 ${className}`}>{store.data.name}</span>
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store aria-hidden className="size-4.5" />
        </span>
        <StoreName />
      </div>
    </header>
  )
}

function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 active:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
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
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store aria-hidden className="size-4.5" />
        </span>
        <StoreName />
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
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
