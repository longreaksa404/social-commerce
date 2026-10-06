import { ImageOff, Minus, Plus, SearchX, Store } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Card, IconButton, Skeleton } from '../components/ui.tsx'
import { thumbnailUrl } from '../lib/images.ts'
import { formatPriceRange } from '../lib/money.ts'
import { useT } from '../i18n/useT.ts'
import type { ShopProductCard, ShopStore } from '../lib/types.ts'
import { buzz } from '../components/effects.ts'
import { MAX_QUANTITY, useCart } from './cart.ts'
import { flyToCart } from './fly.ts'

/** A product photo, or a grey placeholder when the seller has none (or it
 * won't load). It fades in once loaded, over the grey. `className` sizes
 * and shapes it. `small` uses the photo's small copy (grids, lists), or
 * the photo itself if it has none or the copy won't load. */
export function ProductImage({
  src,
  alt,
  className = '',
  eager = false,
  small = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
  small?: boolean
}) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  // Another photo in the same place starts over.
  const [shown, setShown] = useState(src)
  if (shown !== src) {
    setShown(src)
    setState('loading')
  }
  if (!src || state === 'failed') {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
        <ImageOff aria-hidden className="size-8" />
      </div>
    )
  }
  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <img
        key={src}
        src={small ? thumbnailUrl(src) : src}
        onLoad={() => setState('loaded')}
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
        decoding="async"
        className={`size-full object-cover transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
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
  useEffect(() => {
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

export function ProductGrid({ shop, products }: { shop: ShopStore; products: ShopProductCard[] }) {
  const t = useT()
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
      {products.map((product, i) => (
        // The first rows come in one after another.
        <li key={product.id} className="relative animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <Link
            to={`/shop/${shop.slug}/product/${product.slug}`}
            className="group block rounded-2xl transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-600 active:scale-[0.97]"
          >
            <div className="relative overflow-hidden rounded-2xl">
              <ProductImage
                small
                src={product.image_url}
                alt=""
                className={`aspect-square w-full transition-transform group-hover:scale-[1.03] ${
                  product.in_stock ? '' : 'opacity-60'
                }`}
              />
              {!product.in_stock && (
                <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                  {t.shop.soldOut}
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-800">{product.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatPriceRange(product.price_min, product.price_max, shop.currency)}
            </p>
          </Link>
          {/* Beside the link, not in it (a button can't sit inside a link),
              placed over the photo's corner. */}
          {!product.has_variants && product.in_stock && <QuickAdd shop={shop} product={product} />}
        </li>
      ))}
    </ul>
  )
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
    // The photo is square and as wide as the cell: its bottom corner sits
    // a cell-width down from the top.
    <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
      <button
        type="button"
        onClick={add}
        disabled={full}
        aria-label={t.shop.quickAdd(product.name, inCart)}
        className={`pointer-events-auto absolute right-1 bottom-1 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:opacity-60`}
      >
        <span
          key={inCart}
          className={`flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-md ring-1 ring-slate-900/5 tabular-nums transition-colors ${
            inCart ? 'animate-pop bg-accent text-white' : 'bg-surface text-navy-700 active:bg-slate-100'
          }`}
        >
          {inCart ? inCart : <Plus aria-hidden className="size-5" />}
        </span>
      </button>
    </div>
  )
}

export function ProductGridSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-1/3" />
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
