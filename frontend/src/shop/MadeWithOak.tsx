import { OakLeaf } from '../components/OakLeaf.tsx'
import { useT } from '../i18n/useT.ts'

const legalLink =
  'inline-flex min-h-8 items-center rounded px-1 underline underline-offset-2 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-600'

/** At the very bottom of the shop's grid pages and the order page, under a
 * thin line: our mark and "Made with Oak Order" (to the start page, where
 * a customer who sells too can open a shop), then Privacy · Terms, since
 * customers give the shop their name, phone and address. Each opens in a
 * new tab so the shop stays open. Never on the cart and checkout page. */
export function MadeWithOak() {
  const c = useT().shop.credit
  return (
    <footer className="mx-auto mt-10 w-full max-w-6xl px-4">
      <div className="flex flex-col items-center border-t border-slate-200 pt-4 text-center text-slate-500">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-md bg-accent text-white">
            <OakLeaf className="h-4 w-auto" />
          </span>
          <span>
            {c.madeWith} <span className="font-semibold text-slate-700">Oak Order</span>
          </span>
        </a>
        <p className="flex items-center gap-1.5 text-xs">
          <a href="/privacy" target="_blank" rel="noopener" className={legalLink}>
            {c.privacy}
          </a>
          <span aria-hidden>·</span>
          <a href="/terms" target="_blank" rel="noopener" className={legalLink}>
            {c.terms}
          </a>
        </p>
      </div>
    </footer>
  )
}
