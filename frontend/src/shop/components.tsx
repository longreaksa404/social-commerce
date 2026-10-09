import { CalendarClock, ImageOff, Minus, Plus, SearchX, Store } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Badge, Card, IconButton, Skeleton } from '../components/ui.tsx'
import { thumbnailUrl } from '../lib/images.ts'
import { formatPriceRange } from '../lib/money.ts'
import { formatCalendarDay } from '../lib/orders.ts'
import { useT } from '../i18n/useT.ts'
import type { ShopProductCard, ShopStore } from '../lib/types.ts'
import { buzz } from '../components/effects.ts'
import { MAX_QUANTITY, useCart } from './cart.ts'
import { flyToCart } from './fly.ts'

// The grid's photos already shown since the page loaded, with their shape
// (width ÷ height). Shown again (another category and back), a photo is
// just there at its own size, not a grey square fading into it again.
const shownPhotos = new Map<string, number>()

// How many of a list's first photos load at once rather than lazily: they
// are on screen as the page opens, and the biggest one is what phones count
// as the page having loaded (perf audit F5).
export const EAGER_PHOTOS = 4

/** A product photo, or a grey placeholder when the seller has none (or it
 * won't load). It fades in once loaded, over the grey. `className` sizes
 * and shapes it. `small` uses the photo's small copy (grids, lists), or
 * the photo itself if it has none or the copy won't load. `natural` keeps
 * the photo's own shape, as tall as its width makes it (no cropping),
 * square until it first loads. */
export function ProductImage({
  src,
  alt,
  className = '',
  eager = false,
  small = false,
  natural = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
  small?: boolean
  natural?: boolean
}) {
  const ratio = natural && src ? shownPhotos.get(src) : undefined
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(ratio ? 'loaded' : 'loading')
  // Another photo in the same place starts over.
  const [shown, setShown] = useState(src)
  if (shown !== src) {
    setShown(src)
    setState(ratio ? 'loaded' : 'loading')
  }
  const square = natural && state !== 'loaded' ? 'aspect-square' : ''
  if (!src || state === 'failed') {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${square} ${className}`}>
        <ImageOff aria-hidden className="size-8" />
      </div>
    )
  }
  return (
    // A photo shown before keeps its place at its size even if the phone
    // has to fetch it again, and is drawn with the rest of its card.
    <div
      className={`overflow-hidden bg-slate-100 ${square} ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      <img
        key={src}
        src={small ? thumbnailUrl(src) : src}
        onLoad={(e) => {
          const img = e.currentTarget
          if (natural && img.naturalHeight) shownPhotos.set(src, img.naturalWidth / img.naturalHeight)
          setState('loaded')
        }}
        onError={(e) => {
          const img = e.currentTarget
          if (small && !img.dataset.full) {
            img.dataset.full = '1'
            img.src = src
          } else setState('failed')
        }}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding={ratio ? 'sync' : 'async'}
        className={`${natural ? 'block h-auto w-full' : 'size-full object-cover'} transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

/** "All" plus each category, as a row of chips that scrolls sideways on
 * phones. Hidden when the shop has no categories. */
export function CategoryChips({ shop }: { shop: ShopStore }) {
  const nav = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const t = useT()

  // Someone landing on a category link should see which chip is theirs,
  // even when it starts off-screen. Sideways only: the page doesn't move.
  // Before it's drawn: between All and a category the row is new (another
  // page component) and nothing fades over it.
  useLayoutEffect(() => {
    const el = nav.current
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (el && active) el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  if (shop.categories.length === 0) return null
  const chip = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 ${
      isActive
        ? 'border-accent bg-accent text-white'
        : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50 active:bg-slate-100'
    }`
  return (
    <nav ref={nav} aria-label={t.shop.categories} className="relative -mx-4 mb-5 overflow-x-auto [scrollbar-width:none]">
      {/* Padding on the list, not the nav, so the last chip keeps its gap
          from the screen edge when scrolled all the way. */}
      <ul className="flex w-max gap-2 px-4">
        <li>
          <NavLink to={`/shop/${shop.slug}`} end className={chip}>
            {t.shop.all}
          </NavLink>
        </li>
        {shop.categories.map((category) => (
          <li key={category.slug}>
            <NavLink to={`/shop/${shop.slug}/category/${category.slug}`} className={chip}>
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Few left: "Only 3 left", on the grid and the product page. Fixed for
 * customers; the seller's own list and alerts use their level (Settings →
 * Alerts), 5 to start. */
export const LOW_STOCK = 5

// The grid's columns at each width: 2 on phones, then 3, 4 and 5 from
// Tailwind's sm, lg and xl.
const WIDER = [
  [5, window.matchMedia('(min-width: 80rem)')],
  [4, window.matchMedia('(min-width: 64rem)')],
  [3, window.matchMedia('(min-width: 40rem)')],
] as const
const columnCount = () => WIDER.find(([, query]) => query.matches)?.[0] ?? 2
const onWidthChange = (notify: () => void) => {
  for (const [, query] of WIDER) query.addEventListener('change', notify)
  return () => WIDER.forEach(([, query]) => query.removeEventListener('change', notify))
}

/** `items` dealt into `count` columns like cards: the 1st to the left,
 * the 2nd beside it, and so on, so they read left to right, then down. */
function deal<T>(items: T[], count: number): T[][] {
  const columns = Array.from({ length: count }, (): T[] => [])
  items.forEach((item, i) => columns[i % count].push(item))
  return columns
}

// Product lists already shown since the page loaded (by shop and
// category). Opened again, a list comes from the cache, so its cards are
// just there instead of rising in again.
const shownLists = new Set<string>()
// The last card starts rising at 320 ms and takes 300 ms.
const RISE_MS = 1000

/** Whether the cards rise in: only the first time `list` shows (after its
 * loading grid), and only while they come in, so turning the phone (other
 * columns) doesn't play it again. */
function useRising(list: string) {
  const [rising, setRising] = useState(() => (shownLists.has(list) ? null : list))
  useEffect(() => {
    shownLists.add(list)
    const done = setTimeout(() => setRising(null), RISE_MS)
    return () => clearTimeout(done)
  }, [list])
  return rising === list
}

/** Photos, each card as tall as its photo (no cropping to a square),
 * packed in columns like a photo wall: the same cards as the seller's
 * product list, photo on top and name, price, and stock under it. The
 * cards are dealt into side-by-side columns, not CSS columns: iPhone
 * Safari drew a CSS column's cards late, or half, while they rose in.
 * `category` is the category's slug, none for All. */
export function ProductGrid({
  shop,
  products,
  category = '',
}: {
  shop: ShopStore
  products: ShopProductCard[]
  category?: string
}) {
  const count = useSyncExternalStore(onWidthChange, columnCount)
  const rising = useRising(`${shop.slug}/${category}`)
  return (
    <div className="flex gap-3">
      {deal(products, count).map((column, c) => (
        <ul key={c} className="min-w-0 flex-1">
          {column.map((product, row) => (
            // The first ones come in one after another, a row at a time.
            // The whole card is the link (its ::after covers it), so the +
            // can sit on the photo without being inside the link (a button
            // can't be).
            <li key={product.id} className="pb-3">
              <div
                className={`group relative overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-slate-900/6 transition-transform has-[a:active]:scale-[0.98] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-navy-600 ${rising ? 'animate-rise' : ''}`}
                style={rising ? { animationDelay: `${Math.min(row * count + c, 8) * 40}ms` } : undefined}
              >
                <div className="relative">
                  <div className="overflow-hidden">
                    <ProductImage
                      small
                      natural
                      src={product.image_url}
                      alt=""
                      eager={row * count + c < EAGER_PHOTOS}
                      className={`w-full transition-transform group-hover:scale-[1.03] ${product.in_stock ? '' : 'opacity-60'}`}
                    />
                  </div>
                  {!product.has_variants && product.in_stock && <QuickAdd shop={shop} product={product} />}
                </div>
                <Link
                  to={`/shop/${shop.slug}/product/${product.slug}`}
                  className="block p-3 outline-none after:absolute after:inset-0"
                >
                  <span className="line-clamp-2 text-sm leading-5 font-medium text-slate-900">{product.name}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-900 tabular-nums">
                    {formatPriceRange(product.price_min, product.price_max, shop.currency)}
                  </span>
                  <StockTag product={product} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

/** Sold out, or Only 3 left when few are left; nothing otherwise. With
 * options, stock is per option, so only Sold out (every option gone). */
function StockTag({ product }: { product: ShopProductCard }) {
  const t = useT()
  const stock = product.stock_quantity
  let tag = null
  if (!product.in_stock) tag = <Badge tone="red">{t.shop.soldOut}</Badge>
  else if (stock !== null && stock <= LOW_STOCK) tag = <Badge tone="amber">{t.shop.onlyLeft(stock)}</Badge>
  return tag && <span className="mt-1.5 block">{tag}</span>
}

/** + on the photo: one into the cart without opening the product. Shows
 * how many are in the cart once there are some. */
function QuickAdd({ shop, product }: { shop: ShopStore; product: ShopProductCard }) {
  const cart = useCart(shop.slug)
  const t = useT()
  const inCart = cart.quantityOf(product.id, null)
  const full = inCart >= Math.min(MAX_QUANTITY, product.stock_quantity ?? 0)

  function add(event: MouseEvent<HTMLButtonElement>) {
    const photo = event.currentTarget.parentElement?.querySelector('img')
    flyToCart(photo ?? event.currentTarget, photo?.currentSrc || null)
    buzz()
    cart.add({
      productId: product.id,
      variantId: null,
      quantity: 1,
      productSlug: product.slug,
      name: product.name,
      variantName: null,
      price: product.price_min,
      imageUrl: product.image_url,
    })
  }

  return (
    // Over the photo's bottom corner, and above the card's link.
    <button
      type="button"
      onClick={add}
      disabled={full}
      aria-label={t.shop.quickAdd(product.name, inCart)}
      className="absolute right-1 bottom-1 z-10 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:opacity-60"
    >
      <span
        key={inCart}
        className={`flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-md ring-1 ring-slate-900/10 tabular-nums transition-colors ${
          inCart ? 'animate-pop bg-accent text-white' : 'bg-raised text-navy-700 active:bg-slate-100'
        }`}
      >
        {inCart ? inCart : <Plus aria-hidden className="size-5" />}
      </span>
    </button>
  )
}

// Mixed heights, as the photos will be.
const SKELETON_SHAPES = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[3/4]']

export function ProductGridSkeleton() {
  const count = useSyncExternalStore(onWidthChange, columnCount)
  return (
    <div aria-hidden className="flex gap-3">
      {deal(SKELETON_SHAPES, count).map((column, c) => (
        <div key={c} className="min-w-0 flex-1">
          {column.map((shape, row) => (
            <div key={row} className="pb-3">
              <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-slate-900/6">
                <Skeleton className={`w-full rounded-none ${shape}`} />
                <div className="p-3">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** The shop's logo, round as on social media, or the shop icon on green
 * when it has none or it won't load. `className` sizes it. */
export function ShopLogo({ shop, className = 'size-8' }: { shop: ShopStore | undefined; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const logo = shop?.logo_url
  if (logo && failed !== logo) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(logo)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-brand text-white ${className}`}>
      <Store aria-hidden className="size-[55%]" />
    </span>
  )
}

/** "Not here" message for a shop, product, or category link. */
export function NotFound({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <SearchX aria-hidden className="size-6" />
      </span>
      <h1 className="font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}

/** − n + for how many to buy. */
export function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
  label,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
}) {
  const t = useT()
  const button = 'border border-slate-300 bg-surface shadow-xs'
  return (
    <div role="group" aria-label={label ?? t.shop.quantity} className="flex shrink-0 items-center gap-1">
      <IconButton
        icon={Minus}
        label={t.shop.oneLess}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        className={button}
      />
      <output aria-live="polite" className="w-9 text-center text-base font-semibold text-slate-900 tabular-nums">
        {value}
      </output>
      <IconButton
        icon={Plus}
        label={t.shop.oneMore}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      />
    </div>
  )
}

/** At the top of every shop page while the seller isn't taking orders
 * (Settings → Orders): looking around still works, checkout doesn't. */
export function PausedNotice({ shop }: { shop: ShopStore }) {
  const p = useT().shop.paused
  return (
    <div
      role="status"
      className="-mx-4 -mt-4 mb-4 flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:mx-0 sm:mt-0 sm:mb-6 sm:rounded-2xl sm:border sm:px-3.5"
    >
      <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700" />
      <p className="min-w-0 text-sm leading-6 text-amber-900">
        <span className="block font-semibold">{p.title}</span>
        {shop.orders_resume_on ? p.until(formatCalendarDay(shop.orders_resume_on)) : p.noDate}
      </p>
    </div>
  )
}
