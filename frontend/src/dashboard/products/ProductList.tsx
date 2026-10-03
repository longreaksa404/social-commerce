import { ChevronRight, ImageIcon, Package, Plus, SearchX, Tags } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { priceLabel, totalStock } from '../../lib/products.ts'
import type { Currency, Product } from '../../lib/types.ts'
import { useCategories, useProducts, useStore } from '../queries.ts'

type StatusFilter = 'all' | 'active' | 'inactive'
const STATUS_LABELS: Record<StatusFilter, string> = { all: 'All', active: 'Active', inactive: 'Hidden' }

export function ProductList() {
  const products = useProducts()
  const categories = useCategories()
  const store = useStore()
  // Filters live in the URL: they survive opening a product and coming back,
  // and the Categories page can link straight to a filtered list.
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as StatusFilter | null) ?? 'all'
  const categoryId = params.get('category') ?? ''

  const setFilter = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value && value !== 'all') p.set(key, value)
        else p.delete(key)
        return p
      },
      { replace: true },
    )

  const addButton = (
    <Link to="/dashboard/products/new" className={`${buttonClass('primary')} shrink-0`}>
      <Plus aria-hidden className="size-4" />
      Add
    </Link>
  )

  if (products.isPending) return <ListSkeleton />
  if (products.error) {
    return (
      <>
        <PageHeader title="Products" />
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      </>
    )
  }

  const all = products.data
  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Products" />
        <EmptyState
          icon={Package}
          title="Add your first product"
          action={
            <Link to="/dashboard/products/new" className={buttonClass('primary', 'lg')}>
              <Plus aria-hidden className="size-5" />
              Add product
            </Link>
          }
        >
          Products you add here will appear in your shop for customers to order.
        </EmptyState>
      </>
    )
  }

  const currency = store.data?.currency ?? 'USD'
  const categoryName = new Map(categories.data?.map((c) => [c.id, c.name]))
  const inCategory = all.filter((p) => !categoryId || p.category_id === categoryId)
  const count = (s: StatusFilter) => inCategory.filter((p) => s === 'all' || p.status === s).length
  const shown = inCategory.filter((p) => status === 'all' || p.status === status)

  return (
    <>
      <PageHeader title="Products" action={addButton} />

      <div className="mb-4 space-y-3">
        <div role="tablist" aria-label="Filter by visibility" className="grid grid-cols-3 rounded-xl bg-slate-200/70 p-1">
          {(['all', 'active', 'inactive'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => setFilter('status', value)}
              className={`min-h-10 rounded-lg text-sm font-medium transition ${
                status === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {STATUS_LABELS[value]} <span className="text-slate-400">{count(value)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {categories.data && categories.data.length > 0 && (
            <div className="min-w-0 flex-1">
              <Select
                aria-label="Filter by category"
                value={categoryId}
                onChange={(e) => setFilter('category', e.target.value)}
              >
                <option value="">All categories</option>
                {categories.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {/* On phones the tab bar has no room for Categories. */}
          <Link to="/dashboard/categories" className={`${buttonClass('secondary')} shrink-0`}>
            <Tags aria-hidden className="size-4" />
            Categories
          </Link>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No products here"
          action={
            <button type="button" className={buttonClass('secondary')} onClick={() => setParams({}, { replace: true })}>
              Show all products
            </button>
          }
        >
          No products match these filters.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              currency={currency}
              category={product.category_id ? categoryName.get(product.category_id) : undefined}
            />
          ))}
        </Card>
      )}
    </>
  )
}

function ProductRow({ product, currency, category }: { product: Product; currency: Currency; category?: string }) {
  const stock = totalStock(product)
  return (
    <Link
      to={`/dashboard/products/${product.id}`}
      className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      {product.image_urls[0] ? (
        <img
          src={product.image_urls[0]}
          alt=""
          loading="lazy"
          className={`size-16 shrink-0 rounded-xl object-cover ${product.status === 'inactive' ? 'opacity-50' : ''}`}
        />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <ImageIcon aria-hidden className="size-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium leading-normal text-slate-900">{product.name}</span>
        <span className="mt-0.5 block font-semibold text-slate-900">{priceLabel(product, currency)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {product.status === 'inactive' && <Badge>Hidden</Badge>}
          {stock === 0 ? <Badge tone="red">Out of stock</Badge> : <span>{stock} in stock</span>}
          {product.has_variants && <span>· {product.variants.length} variants</span>}
          {category && <span>· {category}</span>}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <>
      <PageHeader title="Products" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 sm:p-4">
            <Skeleton className="size-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}
