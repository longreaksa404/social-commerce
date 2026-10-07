import { PackageOpen } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { EmptyState, ErrorState, Skeleton } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { CategoryChips, ProductGrid, ProductGridSkeleton, ShopLogo } from './components.tsx'
import { ShopInfo } from './ShopInfo.tsx'
import { useShop, useShopProducts } from './queries.ts'

// The shop's name and logo, over the wash ShopLayout draws behind the
// top of the page.
const band = 'mb-5 flex items-start gap-4 pt-1 sm:pt-2'

/** /shop/:storeSlug: the store link a seller shares. */
export function ShopHome() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const products = useShopProducts(storeSlug)
  const t = useT()

  if (!shop.data) {
    return (
      <>
        <div className={band}>
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex-1 pt-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          </div>
        </div>
        <ProductGridSkeleton />
      </>
    )
  }

  return (
    <>
      <title>{shop.data.name}</title>
      {/* The shop's own header, like its page on social media: logo beside
          the name (the header shows the name only once this has scrolled
          away). */}
      <div className={band}>
        <ShopLogo shop={shop.data} className="size-16 shadow-md ring-4 ring-surface" />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-2xl font-bold tracking-tight break-words text-slate-900">{shop.data.name}</h1>
          {shop.data.description && <Description text={shop.data.description} />}
        </div>
      </div>
      <ShopInfo shop={shop.data} className="mb-5" />
      <CategoryChips shop={shop.data} />
      {products.error ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : !products.data ? (
        <ProductGridSkeleton />
      ) : products.data.length === 0 ? (
        <EmptyState icon={PackageOpen} title={t.shop.home.emptyTitle}>
          {t.shop.home.emptyText}
        </EmptyState>
      ) : (
        <ProductGrid shop={shop.data} products={products.data} />
      )}
    </>
  )
}

/** Long descriptions start folded so the products show on the first
 * screen; "Show more" appears only if the text is actually cut off. */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [clamped, setClamped] = useState(false)
  const t = useT()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || open) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    // Rotating the phone changes how many lines the text needs.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, text])

  return (
    <div className="mt-1.5 text-sm leading-6 text-slate-600">
      <p ref={ref} className={`whitespace-pre-line break-words ${open ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="-mx-1 mt-0.5 min-h-8 rounded px-1 font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          {open ? t.shop.home.showLess : t.shop.home.showMore}
        </button>
      )}
    </div>
  )
}
