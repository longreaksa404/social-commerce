import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { Link } from 'react-router'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useLang, useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { SUPPORT_TELEGRAM } from '../lib/support.ts'
import { BrandMark } from './AuthLayout.tsx'
import { fill, LEGAL, UPDATED, type Block, type LegalDoc, type Prices } from './legal/content.ts'

const PATHS: Record<LegalDoc, string> = { privacy: '/privacy', terms: '/terms', 'data-deletion': '/data-deletion' }

/** /privacy, /terms, /data-deletion: public, readable without logging in,
 * in the chosen language (Meta's reviewers read the
 * English). A plain page: the text, its date, and how to reach Oak Order. */
export function Legal({ doc }: { doc: LegalDoc }) {
  const { lang } = useLang()
  const t = useT()
  const page = LEGAL[lang][doc]
  const prices = usePrices()
  // The Terms are as new as their prices.
  const updated = doc === 'terms' && prices.changedOn && prices.changedOn > UPDATED ? prices.changedOn : UPDATED
  const date = new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-GB', { dateStyle: 'long' }).format(
    new Date(`${updated}T12:00:00`),
  )

  return (
    <div className="min-h-dvh bg-surface">
      <title>{`${page.title} · Oak Order`}</title>
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <BrandMark />
        <LanguageSwitch />
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{page.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{t.legal.updated(date)}</p>
        <p className="mt-6 leading-7 text-slate-700">{page.intro}</p>
        {page.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
            <div className="mt-2 space-y-3">
              {section.body.map((block, i) => (
                <Body key={i} block={typeof block === 'string' ? fill(block, prices.values) : block.map((item) => fill(item, prices.values))} />
              ))}
            </div>
          </section>
        ))}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">{t.legal.contact}</h2>
          {SUPPORT_TELEGRAM ? (
            <p className="mt-2 leading-7 text-slate-700">
              {t.legal.contactTelegram}{' '}
              <a
                href={`https://t.me/${SUPPORT_TELEGRAM}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-navy-700 link"
              >
                <Send aria-hidden className="size-4" />@{SUPPORT_TELEGRAM}
              </a>
            </p>
          ) : (
            <p className="mt-2 leading-7 text-slate-700">{t.legal.contactInApp}</p>
          )}
          <p className="mt-2 leading-7 text-slate-700">order.oaksolve.com</p>
        </section>
        <LegalLinks className="mt-12 border-t border-slate-200 pt-6" />
      </main>
    </div>
  )
}

// "9.99" → "$9.99", "99.00" → "$99", as Settings → Plan writes them.
const usd = (amount: string) => `$${Number(amount).toFixed(2).replace(/\.00$/, '')}`

/** Oak Order's prices and trial today (set in the admin), with today's
 * defaults while they load or if they can't. */
function usePrices(): { values: Prices; changedOn: string | null } {
  const query = useQuery({
    queryKey: ['plan-prices'],
    queryFn: () =>
      api<{ month: string; year: string; trial_days: number; changed_on: string | null }>('/plan/prices', { auth: false }),
    staleTime: 5 * 60_000,
  })
  const data = query.data
  return {
    values: data ? { trial: String(data.trial_days), month: usd(data.month), year: usd(data.year) } : { trial: '30', month: '$9.99', year: '$99' },
    changedOn: data?.changed_on ?? null,
  }
}

function Body({ block }: { block: Block }) {
  if (typeof block === 'string') return <p className="leading-7 text-slate-700">{block}</p>
  return (
    <ul className="list-disc space-y-2 pl-5 leading-7 text-slate-700 marker:text-slate-400">
      {block.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** The three pages, as a row of small links (start page, legal pages). */
export function LegalLinks({ className = '', onDark = false }: { className?: string; onDark?: boolean }) {
  const t = useT()
  const link = `inline-flex min-h-11 items-center link ${onDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`
  return (
    <nav className={`flex flex-wrap gap-x-5 text-sm ${className}`}>
      <Link to={PATHS.privacy} className={link}>
        {t.legal.privacy}
      </Link>
      <Link to={PATHS.terms} className={link}>
        {t.legal.terms}
      </Link>
      <Link to={PATHS['data-deletion']} className={link}>
        {t.legal.dataDeletion}
      </Link>
    </nav>
  )
}
