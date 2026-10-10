import { ChevronRight, ShoppingCart } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useMatch, useParams, useSearchParams } from 'react-router'
import { ErrorState, PageOutlet, Skeleton, SlowNotice } from '../components/ui.tsx'
import { LanguageToggle } from '../i18n/LanguageSwitch.tsx'
import { ThemeToggle } from '../theme/ThemeSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney, toCents } from '../lib/money.ts'
import type { Currency, ShopStore } from '../lib/types.ts'
import { useCart } from './cart.ts'
import { NotFound, PausedNotice, ShopLogo } from './components.tsx'
import { CurrentOrderButton } from './CurrentOrder.tsx'
import { openedLink } from './device.ts'
import { onCartLanded } from './fly.ts'
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
  const checkout = useMatch('/shop/:storeSlug/cart') !== null
  const ordersPage = useMatch('/shop/:storeSlug/orders') !== null
  const showOrder = Boolean(shop.data) && !orderPage && !checkout && !ordersPage
  // The grid pages: where the cart bar sits at the bottom.
  const home = useMatch('/shop/:storeSlug') !== null
  const category = useMatch('/shop/:storeSlug/category/:categorySlug') !== null
  const browsing = home || category
  const { count } = useCart(storeSlug)
  const cartBar = browsing && count > 0

  if (isNotFound(shop.error)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <title>{t.shop.shopNotFound}</title>
        <NotFound title={t.shop.shopNotFound}>{t.shop.shopNotFoundText}</NotFound>
      </main>
    )
  }

  return (
    <div className="relative isolate min-h-dvh">
      {/* The top of the shop's grid pages (All and each category): one
          soft wash behind the header and the shop's name, edge to edge,
          like its page on social media. */}
      {browsing && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-navy-50 to-transparent"
        />
      )}
      <Header shop={shop.data} slug={storeSlug} home={browsing} order={showOrder} />
      <main className="mx-auto w-full max-w-6xl px-4 pt-4 sm:pt-6">
        {shop.isPending && <SlowNotice className="mb-4" />}
        {shop.data?.orders_paused && <PausedNotice shop={shop.data} />}
        {shop.error ? <ErrorState error={shop.error} onRetry={() => shop.refetch()} /> : <PageOutlet depth={2} />}
      </main>
      {/* Room under the last row, and for the cart bar over it on phones. */}
      <div aria-hidden className={cartBar ? 'h-28 lg:h-10' : 'h-[calc(env(safe-area-inset-bottom)+2.5rem)]'} />
      {cartBar && <CartBar slug={storeSlug} currency={shop.data?.currency} />}
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

function Header({
  shop,
  slug,
  home,
  order,
}: {
  shop: ShopStore | undefined
  slug: string
  home: boolean
  /** Room for the order on its way (CurrentOrderButton), if there is one. */
  order: boolean
}) {
  // At the top of the shop's home the header is see-through, over the
  // same wash as the shop's name, so the name shows once. On phones the
  // page shows it big and the header's small one waits until that has
  // scrolled away; on laptops the header itself is the big one (logo and
  // name beside the language and cart), shrinking to the bar on scroll.
  const scrolled = useScrolledPast(home ? 96 : 0)
  const top = home && !scrolled
  return (
    <header
      className={`sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
        top ? 'border-transparent bg-transparent' : 'border-slate-200 bg-surface/90 backdrop-blur'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 transition-[height] duration-200 ${
          top ? 'h-14 lg:h-24' : 'h-14'
        }`}
      >
        <Link
          to={`/shop/${slug}`}
          className={`-mx-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-2 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-navy-600 ${
            top ? 'max-lg:invisible max-lg:opacity-0 lg:gap-4' : ''
          }`}
        >
          <ShopLogo shop={shop} className={top ? 'size-8 shadow-md ring-4 ring-surface lg:size-16' : 'size-8'} />
          {shop ? (
            <span
              className={`truncate font-semibold text-slate-900 ${top ? 'lg:text-2xl lg:font-bold lg:tracking-tight' : ''}`}
            >
              {shop.name}
            </span>
          ) : (
            <Skeleton className="h-5 w-36" />
          )}
        </Link>
        <div className="flex shrink-0 items-center">
          {order && <CurrentOrderButton slug={slug} />}
          <ThemeToggle />
          <LanguageToggle />
          <CartButton slug={slug} />
        </div>
      </div>
    </header>
  )
}

/** True once the page has scrolled more than `px` (always true for 0). */
function useScrolledPast(px: number) {
  return useSyncExternalStore(onScroll, () => px === 0 || window.scrollY > px)
}

function onScroll(notify: () => void) {
  window.addEventListener('scroll', notify, { passive: true })
  return () => window.removeEventListener('scroll', notify)
}

/** At the bottom of the shop's grid pages while the cart has something:
 * how many, the total, and the way to the cart, always in reach. */
function CartBar({ slug, currency }: { slug: string; currency: Currency | undefined }) {
  const { lines, count } = useCart(slug)
  const t = useT()
  // The prices saved when added; the cart page checks them again.
  const total = lines.reduce((sum, line) => sum + toCents(line.price) * line.quantity, 0)
  return (
    // Phones and tablets: on a laptop the cart in the header is in reach.
    <div className="fixed inset-x-0 bottom-0 z-30 animate-rise px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <Link
        to={`/shop/${slug}/cart`}
        className="mx-auto flex min-h-14 max-w-xl items-center gap-3 rounded-2xl bg-accent px-4 text-white shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-[0.99]"
      >
        <ShoppingCart aria-hidden className="size-5 shrink-0" />
        <span className="text-sm text-white/85">{t.shop.cartBar.items(count)}</span>
        {currency && <span className="font-bold tabular-nums">{formatMoney(total / 100, currency)}</span>}
        <span className="ml-auto flex items-center gap-1 font-semibold">
          {t.shop.cartBar.view}
          <ChevronRight aria-hidden className="size-4.5" />
        </span>
      </Link>
    </div>
  )
}

function CartButton({ slug }: { slug: string }) {
  const { count } = useCart(slug)
  const t = useT()
  // Bumps each time something added lands in it (shop/fly.ts).
  const [bumps, setBumps] = useState(0)
  useEffect(() => onCartLanded(() => setBumps((n) => n + 1)), [])
  const bump = bumps > 0 ? 'animate-pop' : ''
  return (
    <Link
      to={`/shop/${slug}/cart`}
      data-cart-button
      aria-label={count ? t.shop.cartWithCount(count) : t.shop.cart}
      className="relative -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      <ShoppingCart key={bumps} aria-hidden className={`size-6 ${bump}`} />
      {count > 0 && (
        <span
          key={`count-${bumps}`}
          aria-hidden
          className={`absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white tabular-nums ${bump}`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
