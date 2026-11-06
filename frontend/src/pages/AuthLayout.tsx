import { ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { OakOrderName } from '../components/OakMark.tsx'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { Phrases } from '../i18n/Phrases.tsx'
import { useT } from '../i18n/useT.ts'

/** The product's name, Oak Order (01_PRODUCT.md section 1.1), with the
 * acorn as its O (components/OakMark.tsx): all navy (light navy in dark
 * mode, UI check #15). */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex min-h-11 items-center text-2xl text-oak-ink ${className}`}>
      <OakOrderName />
    </Link>
  )
}

/** A soft light behind the top of the page. Put it in a `relative
 * isolate` box, so it sits under that box's content but over its color. */
export function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-navy-100),transparent)] opacity-70"
    />
  )
}

/** Phones: full-bleed white, the brand above the form (every pixel of
 * width counts at 360px); a centered card from `sm` up. Laptops: split in
 * two, a navy half with the brand, what it does and an example of an
 * order coming in, and the form on the other half (founder's pick,
 * 2026-10-08). */
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
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <Pitch />
      <main className="relative isolate flex min-h-dvh flex-col bg-surface px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:items-center sm:justify-center sm:bg-slate-50 sm:px-4 lg:bg-surface">
        <div className="lg:hidden">
          <Glow />
        </div>
        <div className="mb-8 flex items-center justify-between gap-3 sm:mb-6 sm:w-full sm:max-w-md lg:hidden">
          <BrandMark />
          <LanguageSwitch />
        </div>
        <div className="w-full sm:max-w-md sm:rounded-2xl sm:bg-surface sm:p-8 sm:shadow-card sm:ring-1 sm:ring-slate-900/6 lg:p-0 lg:shadow-none lg:ring-0">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {/* Laptops: the switch on the title's row, so the form starts
                higher and the price shows on a 768 px screen (founder's
                pick 6A, sign-up check 2026-10-18). */}
            <div className="hidden shrink-0 lg:block">
              <LanguageSwitch />
            </div>
          </div>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6 lg:mt-5">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600 lg:mt-5">{footer}</p>
      </main>
    </div>
  )
}

/** The other half on laptops: the page grey (the app's dark grey in dark
 * mode) with the brand, what it does and an example order. It was solid
 * navy; navy is never a background (founder's pick 9A, 2026-11-06). */
function Pitch() {
  const t = useT()
  const p = t.auth.pitch
  return (
    <aside className="hidden flex-col border-r border-slate-200 bg-slate-50 p-12 lg:flex">
      <BrandMark />
      <div className="my-auto max-w-md">
        <p className="text-3xl leading-tight font-bold tracking-tight text-balance">
          <Phrases text={t.auth.home.title} />
        </p>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{p.text}</p>
        {/* An example, said so: what a new order looks like arriving. */}
        <div className="mt-10">
          <p className="mb-2 text-xs font-semibold text-slate-500">{p.example}</p>
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-slate-900/6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-oak-ink">
              <ShoppingBag aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.sampleTitle}</span>
              <span className="block text-sm text-slate-600">{p.sampleText}</span>
            </span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent">{p.sampleTag}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-500">order.oaksolve.com</p>
    </aside>
  )
}
