import { Store } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
        <Store aria-hidden className="size-5" />
      </span>
      Social Commerce
    </Link>
  )
}

/** Full-bleed white on phones (every pixel of width counts at 360px);
 * a centered card from `sm` up. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-white px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:items-center sm:justify-center sm:bg-slate-50 sm:px-4">
      <BrandMark className="mb-8 sm:mb-6" />
      <div className="w-full sm:max-w-md sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-8 sm:shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </main>
  )
}
