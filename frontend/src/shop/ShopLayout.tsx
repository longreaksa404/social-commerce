import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, useLocation, useMatch, useParams, useSearchParams } from 'react-router'
import { ErrorState, PageOutlet, Skeleton, SlowNotice } from '../components/ui.tsx'
import { LanguageToggle } from '../i18n/LanguageSwitch.tsx'
import { ThemeToggle } from '../theme/ThemeSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney, toCents } from '../lib/money.ts'
import type { Currency, ShopStore } from '../lib/types.ts'
import { useCart } from './cart.ts'
import { NotFound, PausedNotice, ShopLogo } from './components.tsx'
import { useShopColor } from './colors.ts'
import { CurrentOrderButton } from './CurrentOrder.tsx'
import { MadeWithOak } from './MadeWithOak.tsx'
import { openedLink } from './device.ts'
import { onCartLanded, useFlying } from './fly.ts'
import { isNotFound, trackView, useShop } from './queries.ts'
import { useMiniApp } from './miniApp.ts'

/** Customer-facing shell for /shop/:storeSlug/*. Pages render right away
 * and load their own data alongside the shop's, rather than waiting for it,
 * so a product link costs one round trip, not two. */
export function ShopLayout() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const t = useT()
  const location = useLocation()
  // Counted under the shop's current link, once it's known.
  useLinkTracking(shop.data?.slug)
  useShopColor(shop.data?.color)
  // Inside Telegram: logged in, the cart from the bot, Telegram's back arrow.
  useMiniApp(storeSlug)
  // Not where the order itself, checkout or the list of orders is showing.
  const orderPage = useMatch('/shop/:storeSlug/order/:orderId') !== null
  const checkout = useMatch('/shop/:storeSlug/cart') !== null
  const ordersPage = useMatch('/shop/:storeSlug/orders') !== null
  const showOrder = Boolean(shop.data) && !orderPage && !checkout && !ordersPage
  // The grid pages: where the cart bar sits at the bottom.
  const home = useMatch('/shop/:storeSlug') !== null
  const category = useMatch('/shop/:storeSlug/category/:categorySlug') !== null
  const browsing = home || category
  // What's still flying to the cart doesn't count yet (cart page check 2B).
  const shown = useCart(storeSlug).count - useFlying().count
  const cartBar = browsing && shown > 0
  // On a phone the cover starts at the very top, under the header's
  // buttons (shop page check 1A); not under the paused notice, which keeps
  // the top. The same rule as ShopHome's CoverBand.
  const phone = useSyncExternalStore(onPhoneChange, () => PHONE.matches)
  const underCover = browsing && phone && Boolean(shop.data?.cover_url) && !shop.data?.orders_paused

  if (isNotFound(shop.error)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <title>{t.shop.shopNotFound}</title>
        <NotFound title={t.shop.shopNotFound}>{t.shop.shopNotFoundText}</NotFound>
      </main>
    )
  }

  // An old link (the seller changed it in Settings → Link): the same page
  // at the current one, so posts already shared keep working.
  if (shop.data && shop.data.slug !== storeSlug) {
    const rest = location.pathname.slice(`/shop/${storeSlug}`.length)
    return <Navigate to={`/shop/${shop.data.slug}${rest}${location.search}${location.hash}`} replace />
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
      <Header shop={shop.data} slug={storeSlug} home={browsing} order={showOrder} underCover={underCover} checkout={checkout} />
      <main className="mx-auto w-full max-w-6xl px-4 pt-4 sm:pt-6">
        {shop.isPending && <SlowNotice className="mb-4" />}
        {shop.data?.orders_paused && <PausedNotice shop={shop.data} />}
        {shop.error ? <ErrorState error={shop.error} onRetry={() => shop.refetch()} /> : <PageOutlet depth={2} />}
      </main>
      {/* Not on product pages, the cart or Your orders (founder's pick 2A). */}
      {shop.data && (browsing || orderPage) && <MadeWithOak />}
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
function useLinkTracking(slug: string | undefined) {
  const token = useSearchParams()[0].get('l')
  useEffect(() => {
    if (slug && token && LINK_TOKEN.test(token) && openedLink(slug, token)) trackView(slug, token)
  }, [slug, token])
}

function Header({
  shop,
  slug,
  home,
  order,
  underCover,
  checkout,
}: {
  shop: ShopStore | undefined
  slug: string
  home: boolean
  /** Room for the order on its way (CurrentOrderButton), if there is one. */
  order: boolean
  /** The cover starts under the header (phones; see ShopLayout). */
  underCover: boolean
  /** The cart page: its own title in the bar, and no cart button. */
  checkout: boolean
}) {
  const t = useT()
  // At the top of the shop's home the header is see-through, over the
  // same wash as the shop's name, so the name shows once. On phones the
  // page shows it big and the header's small one waits until that has
  // scrolled away; on laptops the header itself is the big one (logo and
  // name beside the language and cart), shrinking to the bar on scroll.
  // With a cover the page shows the name below it on laptops too, and the
  // header turns solid as soon as the page moves, so its buttons never sit
  // over the photo. On phones the cover runs up under the header instead
  // (shop page check 1A, founder 2026-11-04): the header stays see-through,
  // its buttons on rounds over the photo, until the name has scrolled
  // under it, then turns solid with the name as elsewhere.
  const cover = Boolean(shop?.cover_url)
  const scrolled = useScrolledPast(home ? (underCover ? nameUnderHeader : cover ? belowCover : 96) : 0)
  const moved = useScrolledPast(home && cover && !underCover ? 1 : 0)
  const top = home && !scrolled
  const clear = cover && !underCover ? home && !moved : top
  const big = top && !cover
  return (
    <header
      className={`sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
        clear ? 'border-transparent bg-transparent' : 'border-slate-200 bg-surface/90 backdrop-blur'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 transition-[height] duration-200 ${
          big ? 'h-14 lg:h-24' : 'h-14'
        }`}
      >
        {checkout ? (
          // The cart page's one bar (cart page check 3A, founder
          // 2026-11-04): back to the shop, "Your order" with the shop's
          // name under it, then the moon and the language; no cart button
          // on the cart itself.
          <div className="-ml-2 flex min-w-0 items-center gap-1">
            <Link
              to={`/shop/${slug}`}
              aria-label={t.common.back}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
            >
              <ChevronLeft aria-hidden className="size-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg leading-6 font-bold tracking-tight text-slate-900">{t.checkout.yourOrder}</h1>
              {shop ? (
                <p className="truncate text-xs leading-4 text-slate-500">{shop.name}</p>
              ) : (
                <Skeleton className="mt-0.5 h-3 w-24" />
              )}
            </div>
          </div>
        ) : (
          <Link
            to={`/shop/${slug}`}
            className={`-mx-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-2 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-navy-600 ${
              big ? 'max-lg:invisible max-lg:opacity-0 lg:gap-4' : top ? 'invisible opacity-0' : ''
            }`}
          >
            <ShopLogo shop={shop} className={big ? 'size-8 shadow-md ring-4 ring-surface lg:size-16' : 'size-8'} />
            {shop ? (
              <span
                className={`truncate font-semibold text-slate-900 ${big ? 'lg:text-2xl lg:font-bold lg:tracking-tight' : ''}`}
              >
                {shop.name}
              </span>
            ) : (
              <Skeleton className="h-5 w-36" />
            )}
          </Link>
        )}
        <div className={`flex shrink-0 items-center ${underCover && clear ? 'on-photo' : ''}`}>
          <ThemeToggle />
          <LanguageToggle />
          {/* The order on its way beside the cart, both in the thumb's
              reach; the settings, set once, further left. */}
          {order && <CurrentOrderButton slug={slug} />}
          {!checkout && <CartButton slug={slug} />}
        </div>
      </div>
    </header>
  )
}

/** True once the page has scrolled more than `px` (always true for 0). */
function useScrolledPast(px: number | (() => number)) {
  return useSyncExternalStore(onScroll, () => {
    const limit = typeof px === 'function' ? px() : px
    return limit === 0 || window.scrollY > limit
  })
}

/** About where the shop's name ends under a 3:1 cover (ShopHome's
 * CoverBand): the cover is as wide as the page, up to the shop's width. */
function belowCover() {
  return Math.min(window.innerWidth, 1152) / 3 + 48
}

/** About where the shop's name goes under the header when the cover
 * starts at the very top (phones, 1A): the cover, edge to edge, ends at a
 * third of the width; the name ends 40px below that, the header 56px down. */
function nameUnderHeader() {
  return window.innerWidth / 3 - 16
}

// Phones: below Tailwind's sm, where the cover runs edge to edge.
const PHONE = window.matchMedia('(max-width: 639.98px)')
function onPhoneChange(notify: () => void) {
  PHONE.addEventListener('change', notify)
  return () => PHONE.removeEventListener('change', notify)
}

function onScroll(notify: () => void) {
  window.addEventListener('scroll', notify, { passive: true })
  return () => window.removeEventListener('scroll', notify)
}

/** At the bottom of the shop's grid pages while the cart has something:
 * how many, the total, and the way to the cart, always in reach. */
function CartBar({ slug, currency }: { slug: string; currency: Currency | undefined }) {
  const { lines, count: all } = useCart(slug)
  const flying = useFlying()
  const t = useT()
  // The prices saved when added; the cart page checks them again. What's
  // still flying to the cart counts once it lands (cart page check 2B).
  const count = all - flying.count
  const total = lines.reduce((sum, line) => sum + toCents(line.price) * line.quantity, 0) - flying.cents
  return (
    // Phones and tablets: on a laptop the cart in the header is in reach.
    <div className="fixed inset-x-0 bottom-0 z-30 animate-rise px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <Link
        to={`/shop/${slug}/cart`}
        className="mx-auto flex min-h-14 max-w-xl items-center gap-3 rounded-2xl bg-accent px-4 text-on-accent shadow-lg transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-[0.99]"
      >
        <ShoppingCart aria-hidden className="size-5 shrink-0" />
        <span className="text-sm text-on-accent/85">{t.shop.cartBar.items(count)}</span>
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
  // What's still flying here counts once it lands (cart page check 2B).
  const count = useCart(slug).count - useFlying().count
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
          className={`absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent tabular-nums ${bump}`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
