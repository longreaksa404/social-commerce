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

/** The start page's top bar, measured the same (64 px, the safe area,
 * `max-w-6xl`, its padding and bottom line) but in the page's flow, not
 * fixed: the start page's bar (home/TopBar.tsx) is a fixed layer for an
 * iPhone flicker fix, and a fixed bar here would take room from the
 * keyboard. No Log in or Create your shop: the link under the form is it. */
function AuthHeader() {
  return (
    <header className="border-b border-slate-200 bg-slate-50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <BrandMark className="text-xl sm:text-2xl" />
        <LanguageSwitch />
      </div>
    </header>
  )
}

/** Log in, Create your shop and the other account pages, as part of the
 * start page (2026-11-07): its grey page and top bar, the form in one
 * white card. Laptops: the start page's `max-w-6xl` grid, the pitch on
 * the left and the card (at most 28rem) on the right, centred up and
 * down only while it fits; taller forms start at the top and scroll.
 * Phones: the card alone, the page scrolls as usual. */
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
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <AuthHeader />
      <main className="flex flex-1 flex-col pt-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:pt-10 lg:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:my-auto sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-x-[clamp(3rem,7vw,7rem)]">
          <Pitch />
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-slate-900/6 sm:p-8">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
              <div className="mt-6">{children}</div>
            </section>
            <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Laptops only, left of the card: the start page's headline, what Oak
 * Order does and an example of an order coming in, in its type sizes. */
function Pitch() {
  const t = useT()
  const p = t.auth.pitch
  return (
    <aside className="hidden lg:block">
      <p className="text-[clamp(2.5rem,4.2vw,3.5rem)] font-semibold text-balance text-slate-900 [&:lang(en)]:leading-[1.06] [&:lang(en)]:tracking-[-0.035em] [&:lang(km)]:leading-[1.4]">
        <Phrases text={t.auth.home.title} />
      </p>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">{p.text}</p>
      {/* An example, said so: what a new order looks like arriving. */}
      <div className="mt-10 max-w-sm">
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
    </aside>
  )
}
