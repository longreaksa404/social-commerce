import { Store } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-slate-900 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
        <Store aria-hidden className="size-5" />
      </span>
      Social Commerce
    </Link>
  )
}

/** A soft green light behind the top of the page. Put it in a `relative
 * isolate` box, so it sits under that box's content but over its color. */
export function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-emerald-100),transparent)] opacity-70"
    />
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
    <main className="relative isolate flex min-h-dvh flex-col bg-surface px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:items-center sm:justify-center sm:bg-slate-50 sm:px-4">
      <Glow />
      <div className="mb-8 flex items-center justify-between gap-3 sm:mb-6 sm:w-full sm:max-w-md">
        <BrandMark />
        <LanguageSwitch />
      </div>
      <div className="w-full sm:max-w-md sm:rounded-2xl sm:bg-surface sm:p-8 sm:shadow-card sm:ring-1 sm:ring-slate-900/6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </main>
  )
}
