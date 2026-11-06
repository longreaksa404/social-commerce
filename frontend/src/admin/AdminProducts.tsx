import { EyeOff, ImageOff, LayoutGrid, List, Package, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorState, Input, Skeleton } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import { formatMoney } from '../lib/money.ts'
import type { AdminProduct } from '../lib/types.ts'
import { AdminPageHeader } from './AdminHeader.tsx'
import { useListParams } from './listParams.ts'
import { useAdminProducts, useHideProduct } from './queries.ts'
import { ago, useSettled } from './shared.ts'

/** /admin/products (part 22, founder's pick 14A, 2026-10-28): the newest
 * products of every shop, so one that shouldn't be sold stands out; Hide
 * from the shop (the seller can show it again). Redesign picks 10A and
 * 10B (2026-11-06): a photo grid that fits the width (cards 168 px or
 * wider) or rows with a small photo and Hide on each, switched at the top
 * (`?view=rows` in the address); a product opens in a panel at the side
 * on a laptop, the grid staying beside it, and in a sheet on a phone. */
export function AdminProducts() {
  const { params, update } = useListParams()
  const view = params.get('view') === 'rows' ? 'rows' : 'grid'
  const [query, setQuery] = useState(params.get('q') ?? '')
  const q = useSettled(query).trim()
  useEffect(() => update({ q: q || null }), [q]) // eslint-disable-line react-hooks/exhaustive-deps
  const products = useAdminProducts(q)
  const [open, setOpen] = useState<AdminProduct | null>(null)
  const items = products.data?.pages.flat() ?? []

  return (
    <>
      <title>Products · Oak Order admin</title>
      <AdminPageHeader title="Products" subtitle="Newest first, every shop" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1 sm:max-w-md">
          <Input
            type="search"
            leading={<Search aria-hidden className="size-4" />}
            placeholder="Search every shop"
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div role="group" aria-label="Show as" className="flex rounded-xl bg-slate-100 p-0.5">
          {(
            [
              ['grid', 'Grid', LayoutGrid],
              ['rows', 'Rows', List],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => update({ view: key === 'grid' ? null : key })}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
                view === key ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      {products.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.error ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title={q ? `No products match “${q}”` : 'No products yet'} />
      ) : (
        <>
          {view === 'grid' ? <Grid items={items} onOpen={setOpen} /> : <Rows items={items} onOpen={setOpen} />}
          {products.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" loading={products.isFetchingNextPage} onClick={() => products.fetchNextPage()}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
      <ProductPanel product={open} onClose={() => setOpen(null)} />
    </>
  )
}

function Grid({ items, onOpen }: { items: AdminProduct[]; onOpen: (p: AdminProduct) => void }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
      {items.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onClick={() => onOpen(product)}
            className="flex h-full w-full flex-col justify-start overflow-hidden rounded-2xl bg-surface text-left shadow-card ring-1 ring-slate-900/6 transition hover:ring-slate-900/15 focus-visible:outline-2 focus-visible:outline-navy-600"
          >
            <Photo product={product} className={`aspect-square w-full ${product.status === 'inactive' ? 'opacity-50' : ''}`} />
            <span className="block px-3 pt-2 pb-3 text-sm">
              <span className="line-clamp-2 font-semibold break-words text-slate-900">{product.name}</span>
              <span className="block font-semibold text-slate-900 tabular-nums">{formatMoney(product.price, product.currency)}</span>
              <span className="line-clamp-2 break-words text-slate-500">{product.shop}</span>
              {product.status === 'inactive' && <span className="block text-xs font-semibold text-slate-500">Hidden</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Rows (pick 10B): faster to read names, shops and prices, with Hide on
 * each row; it asks first. */
function Rows({ items, onOpen }: { items: AdminProduct[]; onOpen: (p: AdminProduct) => void }) {
  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            {['Product', 'Shop', 'Price', 'Added', 'Status', ''].map((h, i) => (
              <th key={i} scope="col" className={`px-4 py-2.5 font-medium whitespace-nowrap ${h === 'Price' ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((product) => (
            <tr key={product.id} className="transition-colors hover:bg-slate-50">
              <td className="min-w-56 px-4 py-2">
                <button type="button" onClick={() => onOpen(product)} className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-navy-600">
                  <Photo product={product} className={`size-11 shrink-0 rounded-lg ${product.status === 'inactive' ? 'opacity-50' : ''}`} />
                  <span className="line-clamp-2 font-medium break-words text-slate-900">{product.name}</span>
                </button>
              </td>
              <td className="min-w-44 px-4 py-2">
                <Link to={`/admin/shops/${product.store_id}`} className="line-clamp-2 break-words text-slate-600 hover:underline">
                  {product.shop}
                </Link>
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap text-slate-900 tabular-nums">{formatMoney(product.price, product.currency)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-500">{ago(product.created_at)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-500">{product.status === 'active' ? 'Showing' : 'Hidden'}</td>
              <td className="px-4 py-2 text-right">{product.status === 'active' && <HideButton product={product} ask />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

/** Hide from the shop: in the open product's panel it is the step that
 * asks; on a row it asks first (`ask`). */
function HideButton({ product, ask = false, onDone, wide = false }: { product: AdminProduct; ask?: boolean; onDone?: () => void; wide?: boolean }) {
  const { confirm, toast } = useFeedback()
  const hide = useHideProduct()
  async function run() {
    if (ask) {
      const ok = await confirm({ title: `Hide ${product.name}?`, message: `Customers of ${product.shop} stop seeing it. The seller can show it again.`, confirmLabel: 'Hide' })
      if (!ok) return
    }
    hide.mutate(
      { id: product.id, reason: null },
      {
        onSuccess: () => {
          toast('Hidden · in the log')
          onDone?.()
        },
        onError: (error) => toast(errorText(error), 'error'),
      },
    )
  }
  return (
    <Button variant="secondary" loading={hide.isPending} onClick={run} className={wide ? 'w-full' : ''}>
      <EyeOff aria-hidden className="size-4" />
      {wide ? 'Hide from the shop' : 'Hide'}
    </Button>
  )
}

/** The open product: a panel at the right on a laptop (the list stays in
 * view), a sheet from the bottom on a phone. Esc or ✕ closes it. */
function ProductPanel({ product, onClose }: { product: AdminProduct | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (product && !el.open) el.showModal()
    else if (!product && el.open) el.close()
  }, [product])
  return (
    <dialog
      ref={dialog}
      aria-label={product?.name ?? 'Product'}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up lg:mt-0 lg:ml-auto lg:h-dvh lg:max-h-none lg:w-96 lg:rounded-none lg:open:animate-none"
    >
      {product && (
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] lg:pb-5">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="min-w-0 flex-1 font-semibold text-slate-900">Product</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="flex gap-3 lg:flex-col">
            <Photo product={product} className="size-24 shrink-0 rounded-xl lg:aspect-square lg:size-auto lg:w-full" />
            <div className="min-w-0 text-sm">
              <p className="text-base leading-snug font-semibold break-words text-slate-900">{product.name}</p>
              <p className="mt-1 font-semibold text-slate-900 tabular-nums">{formatMoney(product.price, product.currency)}</p>
              <Link to={`/admin/shops/${product.store_id}`} onClick={onClose} className="block break-words text-navy-700 underline-offset-4 hover:underline">
                {product.shop}
              </Link>
              <p className="text-slate-500">
                Added {ago(product.created_at)} · {product.status === 'active' ? 'showing' : 'hidden'}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {product.status === 'active' ? (
              <>
                <HideButton product={product} onDone={onClose} wide />
                <p className="text-sm text-slate-500">The seller can show it again. It goes in the log.</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Hidden: customers don't see it. The seller can show it again.</p>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
