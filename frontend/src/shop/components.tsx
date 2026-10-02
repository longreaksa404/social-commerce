import { ImageOff, SearchX } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Card, Skeleton } from '../components/ui.tsx'
import { formatPriceRange } from '../lib/money.ts'
import type { ShopProductCard, ShopStore } from '../lib/types.ts'

/** A product photo, or a grey placeholder when the seller has none. */
export function ProductImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
        <ImageOff aria-hidden className="size-8" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      className={`bg-slate-100 object-cover ${className}`}
    />
  )
}

/** "All" plus each category, as a row of chips that scrolls sideways on
 * phones. Hidden when the shop has no categories. */
export function CategoryChips({ shop }: { shop: ShopStore }) {
  const nav = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // Someone landing on a category link should see which chip is theirs,
  // even when it starts off-screen. Sideways only: the page doesn't move.
  useEffect(() => {
    const el = nav.current
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (el && active) el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  if (shop.categories.length === 0) return null
  const chip = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
      isActive
        ? 'border-emerald-700 bg-emerald-700 text-white'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
    }`
  return (
    <nav ref={nav} aria-label="Categories" className="relative -mx-4 mb-5 overflow-x-auto [scrollbar-width:none]">
      {/* Padding on the list, not the nav, so the last chip keeps its gap
          from the screen edge when scrolled all the way. */}
      <ul className="flex w-max gap-2 px-4">
        <li>
          <NavLink to={`/shop/${shop.slug}`} end className={chip}>
            All
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
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            to={`/shop/${shop.slug}/product/${product.slug}`}
            className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
          >
            <div className="relative overflow-hidden rounded-2xl">
              <ProductImage
                src={product.image_url}
                alt=""
                className={`aspect-square w-full transition-transform group-hover:scale-[1.03] ${
                  product.in_stock ? '' : 'opacity-60'
                }`}
              />
              {!product.in_stock && (
                <span className="absolute top-2 left-2 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                  Sold out
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-800">{product.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatPriceRange(product.price_min, product.price_max, shop.currency)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
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
