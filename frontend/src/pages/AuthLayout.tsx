import { ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { OakOrderName } from '../components/OakMark.tsx'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useT } from '../i18n/useT.ts'

/** The product's name, Oak Order (01_PRODUCT.md section 1.1), with the
 * acorn as its O (components/OakMark.tsx): all navy (light navy in dark
 * mode, UI check #15), or all white with `onDark` for the navy panel. */
export function BrandMark({ className = '', onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex min-h-11 items-center text-2xl ${onDark ? 'text-white' : 'text-oak-ink'} ${className}`}
    >
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

/** The navy half on laptops. The same deep navy in light and dark: it's
 * the brand, not the page. */
function Pitch() {
  const t = useT()
  const p = t.auth.pitch
  return (
    <aside className="hidden flex-col bg-[#182841] p-12 text-white lg:flex">
      <BrandMark onDark />
      <div className="my-auto max-w-md">
        <p className="text-3xl leading-tight font-bold tracking-tight text-balance">{t.auth.home.title}</p>
        <p className="mt-4 text-lg leading-relaxed text-white/75">{p.text}</p>
        {/* An example, said so: what a new order looks like arriving. */}
        <div className="mt-10">
          <p className="mb-2 text-xs font-semibold text-white/60">{p.example}</p>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <ShoppingBag aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.sampleTitle}</span>
              <span className="block text-sm text-white/70">{p.sampleText}</span>
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#182841]">{p.sampleTag}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-white/50">order.oaksolve.com</p>
    </aside>
  )
}
