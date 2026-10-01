import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Spinner } from '../components/ui.tsx'
import { useStore } from './queries.ts'

const links = [
  { to: '/dashboard/products', label: 'Products' },
  { to: '/dashboard/categories', label: 'Categories' },
  { to: '/dashboard/settings', label: 'Settings' },
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
  const { logout } = useAuth()
  const store = useStore()

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="truncate font-semibold text-slate-900">{store.data?.name ?? ' '}</span>
          <button type="button" onClick={logout} className="shrink-0 text-sm text-slate-600 hover:text-slate-900">
            Log out
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
