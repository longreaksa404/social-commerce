import { ChevronRight, ImageIcon, Package, Plus, SearchX, Tags } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { useT } from '../../i18n/useT.ts'
import { priceLabel, totalStock } from '../../lib/products.ts'
import type { Currency, Product } from '../../lib/types.ts'
import { useCategories, useProducts, useStore } from '../queries.ts'

type StatusFilter = 'all' | 'active' | 'inactive'

export function ProductList() {
  const products = useProducts()
  const categories = useCategories()
  const store = useStore()
  const t = useT()
  const p = t.products
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
      {t.common.add}
    </Link>
  )

  if (products.isPending) return <ListSkeleton />
  if (products.error) {
    return (
      <>
        <PageHeader title={p.title} />
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      </>
    )
  }

  const all = products.data
  if (all.length === 0) {
    return (
      <>
        <PageHeader title={p.title} />
        <EmptyState
          icon={Package}
          title={p.emptyTitle}
          action={
            <Link to="/dashboard/products/new" className={buttonClass('primary', 'lg')}>
              <Plus aria-hidden className="size-5" />
              {p.addProduct}
            </Link>
          }
        >
          {p.emptyText}
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
      <PageHeader title={p.title} action={addButton} />

      <div className="mb-4 space-y-3">
        <div role="tablist" aria-label={p.filterVisibility} className="grid grid-cols-3 rounded-xl bg-slate-200/70 p-1">
          {(['all', 'active', 'inactive'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => setFilter('status', value)}
              className={`min-h-10 rounded-lg text-sm font-medium transition ${
                status === value ? 'bg-raised text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {p.status[value]} <span className="text-slate-400">{count(value)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {categories.data && categories.data.length > 0 && (
            <div className="min-w-0 flex-1">
              <Select
                aria-label={p.filterCategory}
                value={categoryId}
                onChange={(e) => setFilter('category', e.target.value)}
              >
                <option value="">{p.allCategories}</option>
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
            {t.dashboard.tab.categories}
          </Link>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={p.noneHereTitle}
          action={
            <button type="button" className={buttonClass('secondary')} onClick={() => setParams({}, { replace: true })}>
              {p.showAll}
            </button>
          }
        >
          {p.noneHereText}
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
  const p = useT().products
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
          {product.status === 'inactive' && <Badge>{p.hidden}</Badge>}
          {stock === 0 ? <Badge tone="red">{p.outOfStock}</Badge> : <span>{p.inStock(stock)}</span>}
          {product.has_variants && <span>· {p.variantCount(product.variants.length)}</span>}
          {category && <span>· {category}</span>}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

function ListSkeleton() {
  const p = useT().products
  return (
    <>
      <PageHeader title={p.title} />
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
