import { ShoppingBag, Store } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Outlet, useMatch, useParams, useSearchParams } from 'react-router'
import { ErrorState, Skeleton, SlowNotice } from '../components/ui.tsx'
import { LanguageToggle } from '../i18n/LanguageSwitch.tsx'
import { ThemeToggle } from '../theme/ThemeSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import type { ShopStore } from '../lib/types.ts'
import { useCart } from './cart.ts'
import { NotFound } from './components.tsx'
import { CurrentOrderBar } from './CurrentOrderBar.tsx'
import { openedLink } from './device.ts'
import { isNotFound, trackView, useShop } from './queries.ts'

/** Customer-facing shell for /shop/:storeSlug/*. Pages render right away
 * and load their own data alongside the shop's, rather than waiting for it,
 * so a product link costs one round trip, not two. */
export function ShopLayout() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const t = useT()
  useLinkTracking(storeSlug)
  // Not where the order itself, checkout or the list of orders is showing.
  const orderPage = useMatch('/shop/:storeSlug/order/:orderId') !== null
  const checkout = useMatch('/shop/:storeSlug/checkout') !== null
  const ordersPage = useMatch('/shop/:storeSlug/orders') !== null
  const showOrderBar = shop.data && !orderPage && !checkout && !ordersPage

  if (isNotFound(shop.error)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <title>{t.shop.shopNotFound}</title>
        <NotFound title={t.shop.shopNotFound}>{t.shop.shopNotFoundText}</NotFound>
      </main>
    )
  }

  return (
    <div className="min-h-dvh">
      <Header shop={shop.data} slug={storeSlug} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] sm:pt-6">
        {shop.isPending && <SlowNotice className="mb-4" />}
        {showOrderBar && <CurrentOrderBar slug={storeSlug} />}
        {shop.error ? <ErrorState error={shop.error} onRetry={() => shop.refetch()} /> : <Outlet />}
      </main>
    </div>
  )
}

// A link's token: what the seller's links add to the page's address.
const LINK_TOKEN = /^[a-z0-9]{8}$/

/** Opened through one of the seller's links (?l=<token>, 02_TECHNICAL.md
 * section 9.2): count the view, and remember the link so an order placed
 * on this device within 7 days counts for it. */
function useLinkTracking(slug: string) {
  const token = useSearchParams()[0].get('l')
  useEffect(() => {
    if (token && LINK_TOKEN.test(token) && openedLink(slug, token)) trackView(slug, token)
  }, [slug, token])
}

function Header({ shop, slug }: { shop: ShopStore | undefined; slug: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          to={`/shop/${slug}`}
          className="-mx-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Store aria-hidden className="size-4.5" />
            </span>
          )}
          {shop ? (
            <span className="truncate font-semibold text-slate-900">{shop.name}</span>
          ) : (
            <Skeleton className="h-5 w-36" />
          )}
        </Link>
        <div className="flex shrink-0 items-center">
          <ThemeToggle />
          <LanguageToggle />
          <CartButton slug={slug} />
        </div>
      </div>
    </header>
  )
}

function CartButton({ slug }: { slug: string }) {
  const { count } = useCart(slug)
  const t = useT()
  return (
    <Link
      to={`/shop/${slug}/cart`}
      aria-label={count ? t.shop.cartWithCount(count) : t.shop.cart}
      className="relative -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <ShoppingBag aria-hidden className="size-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
