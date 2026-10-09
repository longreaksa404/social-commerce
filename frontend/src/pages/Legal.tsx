import { Send } from 'lucide-react'
import { Link } from 'react-router'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useLang, useT } from '../i18n/useT.ts'
import { SUPPORT_TELEGRAM } from '../lib/support.ts'
import { BrandMark } from './AuthLayout.tsx'
import { LEGAL, UPDATED, type Block, type LegalDoc } from './legal/content.ts'

const PATHS: Record<LegalDoc, string> = { privacy: '/privacy', terms: '/terms', 'data-deletion': '/data-deletion' }

/** /privacy, /terms, /data-deletion: public, readable without logging in,
 * in the chosen language (Meta's and TikTok's reviewers read the
 * English). A plain page: the text, its date, and how to reach Oak Order. */
export function Legal({ doc }: { doc: LegalDoc }) {
  const { lang } = useLang()
  const t = useT()
  const page = LEGAL[lang][doc]
  const date = new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-GB', { dateStyle: 'long' }).format(
    new Date(`${UPDATED}T12:00:00`),
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
                <Body key={i} block={block} />
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
                className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline"
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
  const link = `inline-flex min-h-11 items-center hover:underline ${onDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`
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
