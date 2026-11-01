import { EyeOff, ImageOff, Package, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { Button, EmptyState, ErrorMessage, ErrorState, Input, PageHeader, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import type { AdminProduct } from '../lib/types.ts'
import { useAdminProducts, useHideProduct } from './queries.ts'
import { ago, useSettled } from './shared.ts'
import { Sheet } from './ui.tsx'

/** /admin/products (part 22, founder's pick 14A, 2026-10-28): the newest
 * products of every shop as a photo grid, so one that shouldn't be sold
 * stands out; a tap opens it with Hide from the shop (the seller can show
 * it again). */
export function AdminProducts() {
  const [query, setQuery] = useState('')
  const q = useSettled(query).trim()
  const products = useAdminProducts(q)
  const [open, setOpen] = useState<AdminProduct | null>(null)
  const items = products.data?.pages.flat() ?? []

  return (
    <>
      <title>Products · Oak Order admin</title>
      <PageHeader title="Products" />
      <div className="mb-4 max-w-xl">
        <Input
          type="search"
          leading={<Search aria-hidden className="size-4" />}
          placeholder="Search every shop"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {products.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.error ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title={q ? 'No products found' : 'No products yet'} />
      ) : (
        <>
          <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{q ? 'Found' : 'Newest'}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setOpen(product)}
                  className="block h-full w-full overflow-hidden rounded-2xl bg-surface text-left shadow-card ring-1 ring-slate-900/6 transition hover:ring-slate-900/15 focus-visible:outline-2 focus-visible:outline-navy-600"
                >
                  <Photo product={product} className="aspect-square w-full" />
                  <span className="block px-3 pt-2 pb-3 text-sm">
                    <span className="block truncate font-semibold text-slate-900">{product.name}</span>
                    <span className="block truncate text-slate-500">
                      {formatMoney(product.price, product.currency)} · {product.shop}
                    </span>
                    {product.status === 'inactive' && <span className="block text-xs font-semibold text-slate-500">Hidden</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {products.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" loading={products.isFetchingNextPage} onClick={() => products.fetchNextPage()}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
      <ProductSheet product={open} onClose={() => setOpen(null)} />
    </>
  )
}

function Photo({ product, className }: { product: AdminProduct; className: string }) {
  const [failed, setFailed] = useState(false)
  if (!product.image_url || failed) {
    return (
      <span className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}>
        <ImageOff aria-hidden className="size-6" />
      </span>
    )
  }
  return <img src={product.image_url} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} bg-slate-100 object-cover`} />
}

function ProductSheet({ product, onClose }: { product: AdminProduct | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const hide = useHideProduct()

  function close() {
    hide.reset()
    onClose()
  }

  return (
    <Sheet open={product !== null} onClose={close} title={product?.name ?? ''}>
      {product && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <Photo product={product} className="size-20 shrink-0 rounded-xl" />
            <p className="min-w-0 text-sm text-slate-500">
              <span className="block font-semibold text-slate-900">{formatMoney(product.price, product.currency)}</span>
              <Link to={`/admin/shops/${product.store_id}`} className="block truncate text-navy-700 underline-offset-4 hover:underline">
                {product.shop}
              </Link>
              <span className="block">
                Added {ago(product.created_at)} · {product.status === 'active' ? 'showing' : 'hidden'}
              </span>
            </p>
          </div>
          <ErrorMessage error={hide.error} />
          <div className="mt-5 space-y-2">
            {product.status === 'active' ? (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={hide.isPending}
                  onClick={() =>
                    hide.mutate(
                      { id: product.id, reason: null },
                      {
                        onSuccess: () => {
                          toast('Hidden · in the log')
                          close()
                        },
                      },
                    )
                  }
                >
                  <EyeOff aria-hidden className="size-4" />
                  Hide from the shop
                </Button>
                <p className="text-sm text-slate-500">The seller can show it again. It goes in the log.</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Hidden: customers don't see it. The seller can show it again.</p>
            )}
          </div>
        </>
      )}
    </Sheet>
  )
}
