import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link to="/" className="mb-6 text-lg font-semibold text-slate-900">
        Social Commerce
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-5 text-xl font-semibold text-slate-900">{title}</h1>
        {children}
      </div>
      <p className="mt-4 text-sm text-slate-600">{footer}</p>
    </main>
  )
}
