import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, ImageIcon, LayoutGrid, List, Package, Plus, SearchX, Tags } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { useT } from '../../i18n/useT.ts'
import { thumbnailUrl } from '../../lib/images.ts'
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
  // Photos or List, remembered on this device (founder: let sellers pick).
  const [view, setView] = useState<View>(storedView)
  const chooseView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Private browsing: it lasts until the page is closed.
    }
  }

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
      <PageHeader
        title={p.title}
        action={
          <div className="flex shrink-0 items-center gap-2">
            <ViewSwitch view={view} onChange={chooseView} />
            {addButton}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label={p.filterVisibility} className="grid grid-cols-3 rounded-xl bg-slate-200/70 p-1 lg:w-96">
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
        <div className="flex gap-2 lg:ml-auto">
          {categories.data && categories.data.length > 0 && (
            <div className="min-w-0 flex-1 lg:w-56 lg:flex-none">
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
          <Link to="/dashboard/categories" className={`${buttonClass('secondary')} shrink-0 lg:hidden`}>
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
      ) : view === 'grid' ? (
        <ProductGrid products={shown} currency={currency} />
      ) : (
        <>
          <Card className="divide-y divide-slate-100 overflow-hidden lg:hidden">
            {shown.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                currency={currency}
                category={product.category_id ? categoryName.get(product.category_id) : undefined}
              />
            ))}
          </Card>
          <ProductTable products={shown} currency={currency} categoryName={categoryName} />
        </>
      )}
    </>
  )
}

type View = 'grid' | 'list'
const VIEW_KEY = 'sc.products.view'

function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

/** Photos | List, as two icon buttons. */
function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const p = useT().products
  const options = [
    { value: 'grid' as const, icon: LayoutGrid, label: p.view.grid },
    { value: 'list' as const, icon: List, label: p.view.list },
  ]
  return (
    <div role="group" aria-label={p.view.label} className="inline-flex rounded-xl bg-slate-200/70 p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={`flex size-9 items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
            view === value ? 'bg-raised text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon aria-hidden className="size-4.5" />
        </button>
      ))}
    </div>
  )
}

/** Few left: amber with the number; none: red; hidden: grey (with its
 * stock, which still matters once it's shown again). "Few" is the
 * seller's own low-stock alert level (Settings → Alerts). */
function StockTag({ product }: { product: Product }) {
  const p = useT().products
  const level = useStore().data?.low_stock_alert ?? DEFAULT_LOW_STOCK
  const stock = totalStock(product)
  if (stock === 0) return <Badge tone="red">{p.outOfStock}</Badge>
  if (stock <= level) return <Badge tone="amber">{p.onlyLeft(stock)}</Badge>
  return <Badge>{p.inStock(stock)}</Badge>
}

// A new shop's level, as the backend's notifications.DEFAULT_LOW_STOCK.
const DEFAULT_LOW_STOCK = 5

/** Photos, each card as tall as its photo (no cropping to a square),
 * packed in columns like a photo wall. */
function ProductGrid({ products, currency }: { products: Product[]; currency: Currency }) {
  const p = useT().products
  return (
    <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
      {products.map((product) => {
        const hidden = product.status === 'inactive'
        return (
          // The gap is padding, not margin: Safari carries a margin (and
          // the card's shadow) over to the top of the next column.
          <li key={product.id} className="break-inside-avoid pb-3">
            <Link
              to={`/dashboard/products/${product.id}`}
              className="block overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-slate-900/6 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-[0.98]"
            >
              <span className="relative block">
                {product.image_urls[0] ? (
                  <img
                    src={thumbnailUrl(product.image_urls[0])}
                    onError={(e) => {
                      const full = product.image_urls[0]
                      if (e.currentTarget.src !== full) e.currentTarget.src = full
                    }}
                    alt=""
                    loading="lazy"
                    className={`block h-auto w-full ${hidden ? 'opacity-50' : ''}`}
                  />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center bg-slate-100 text-slate-400">
                    <ImageIcon aria-hidden className="size-8" />
                  </span>
                )}
                {hidden && (
                  <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {p.hiddenFromShop}
                  </span>
                )}
              </span>
              <span className="block p-3">
                <span className="line-clamp-2 text-sm leading-5 font-medium text-slate-900">{product.name}</span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-900 tabular-nums">{priceLabel(product, currency)}</span>
                <span className="mt-1.5 block">
                  <StockTag product={product} />
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

type SortKey = 'name' | 'price' | 'stock'

/** Laptops, List: a table, sorted by any of its number or name columns. */
function ProductTable({
  products,
  currency,
  categoryName,
}: {
  products: Product[]
  currency: Currency
  categoryName: Map<string, string>
}) {
  const t = useT()
  const c = t.products.column
  const [sort, setSort] = useState<{ key: SortKey; up: boolean } | null>(null)
  const lowest = (product: Product) =>
    product.has_variants
      ? Math.min(...product.variants.map((v) => Number(v.price_override ?? product.price)))
      : Number(product.price)
  const sorted = sort
    ? [...products].sort((a, b) => {
        const by =
          sort.key === 'name'
            ? a.name.localeCompare(b.name)
            : sort.key === 'price'
              ? lowest(a) - lowest(b)
              : totalStock(a) - totalStock(b)
        return sort.up ? by : -by
      })
    : products
  const head = (key: SortKey, label: string, end = false) => {
    const on = sort?.key === key
    return (
      <th scope="col" aria-sort={on ? (sort.up ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 ${end ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={() => setSort(on ? { key, up: !sort.up } : { key, up: key === 'name' })}
          aria-label={c.sortBy(label)}
          className={`inline-flex items-center gap-1 rounded font-semibold hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-navy-600 ${on ? 'text-slate-900' : ''}`}
        >
          {label}
          {on ? (sort.up ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />) : <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />}
        </button>
      </th>
    )
  }
  return (
    <Card className="hidden overflow-hidden lg:block">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <th scope="col" className="w-16 px-4 py-3">
              <span className="sr-only">{t.products.photos}</span>
            </th>
            {head('name', c.name)}
            {head('price', c.price, true)}
            {head('stock', c.stock)}
            <th scope="col" className="px-4 py-3 text-left font-semibold">{c.category}</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">{c.inShop}</th>
            <th scope="col" className="w-10 pr-3">
              <span className="sr-only">{c.open}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((product) => (
            <tr key={product.id} className="relative transition-colors hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <Thumb product={product} className="size-11" />
              </td>
              <td className="max-w-80 px-4 py-2.5">
                {/* The whole row opens the product (the link stretches over it). */}
                <Link
                  to={`/dashboard/products/${product.id}`}
                  className="line-clamp-2 font-medium text-slate-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
                >
                  {product.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">{priceLabel(product, currency)}</td>
              <td className="px-4 py-2.5">
                <StockTag product={product} />
              </td>
              <td className="px-4 py-2.5 text-slate-600">{product.category_id ? categoryName.get(product.category_id) : '–'}</td>
              <td className="px-4 py-2.5">
                {product.status === 'inactive' ? <Badge>{t.products.hidden}</Badge> : <span className="text-slate-600">{c.shown}</span>}
              </td>
              <td className="pr-3 text-slate-300">
                <ChevronRight aria-hidden className="size-5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function Thumb({ product, className }: { product: Product; className: string }) {
  const hidden = product.status === 'inactive'
  return product.image_urls[0] ? (
    <img
      src={thumbnailUrl(product.image_urls[0])}
      onError={(e) => {
        const full = product.image_urls[0]
        if (e.currentTarget.src !== full) e.currentTarget.src = full
      }}
      alt=""
      loading="lazy"
      // max-w-none: the base img rule (max-width: 100%) squeezes it to a
      // narrow strip inside the desktop table's photo column.
      className={`max-w-none shrink-0 rounded-xl object-cover ${hidden ? 'opacity-50' : ''} ${className}`}
    />
  ) : (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ${className}`}>
      <ImageIcon aria-hidden className="size-5" />
    </span>
  )
}

/** Phones, List: a row per product. */
function ProductRow({ product, currency, category }: { product: Product; currency: Currency; category?: string }) {
  const p = useT().products
  return (
    <Link
      to={`/dashboard/products/${product.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <Thumb product={product} className="size-16" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 leading-normal font-medium text-slate-900">{product.name}</span>
        <span className="mt-0.5 block font-semibold text-slate-900 tabular-nums">{priceLabel(product, currency)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {product.status === 'inactive' && <Badge>{p.hiddenFromShop}</Badge>}
          <StockTag product={product} />
          {product.has_variants && <span>{p.variantCount(product.variants.length)}</span>}
          {category && <span>{category}</span>}
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
          <div key={i} className="flex items-center gap-3 px-4 py-3 sm:p-4">
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
