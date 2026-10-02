import { Store } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router'
import { ErrorState, Skeleton } from '../components/ui.tsx'
import type { ShopStore } from '../lib/types.ts'
import { NotFound } from './components.tsx'
import { isNotFound, useShop } from './queries.ts'

/** Customer-facing shell for /shop/:storeSlug/*. Pages render right away
 * and load their own data alongside the shop's, rather than waiting for it,
 * so a product link costs one round trip, not two. */
export function ShopLayout() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)

  if (isNotFound(shop.error)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <title>Shop not found</title>
        <NotFound title="Shop not found">Check the link, or ask the seller to send it again.</NotFound>
      </main>
    )
  }

  return (
    <div className="min-h-dvh">
      <Header shop={shop.data} slug={storeSlug} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] sm:pt-6">
        {shop.error ? <ErrorState error={shop.error} onRetry={() => shop.refetch()} /> : <Outlet />}
      </main>
    </div>
  )
}

function Header({ shop, slug }: { shop: ShopStore | undefined; slug: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link
          to={`/shop/${slug}`}
          className="-mx-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Store aria-hidden className="size-4.5" />
            </span>
          )}
          {shop ? (
            <span className="truncate font-semibold text-slate-900">{shop.name}</span>
          ) : (
            <Skeleton className="h-5 w-36" />
          )}
        </Link>
      </div>
    </header>
  )
}
