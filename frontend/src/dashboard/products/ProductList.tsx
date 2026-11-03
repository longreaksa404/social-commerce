import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, EyeOff, LayoutGrid, List, Package, Plus, SearchX, Tags } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Card, DotList, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { centreChosen } from '../../components/revealChosen.ts'
import { useT } from '../../i18n/useT.ts'
import { thumbnailUrl } from '../../lib/images.ts'
import { deal, useColumnCount } from '../../components/columns.ts'
import { EAGER_PHOTOS, NoPhoto } from '../../shop/components.tsx'
import { formatMoney } from '../../lib/money.ts'
import { lowestSalePrice, priceLabel, totalStock } from '../../lib/products.ts'
import type { Category, Currency, Product } from '../../lib/types.ts'
import { useCategories, useProducts, useStore } from '../queries.ts'

export function ProductList() {
  const products = useProducts()
  const categories = useCategories()
  const store = useStore()
  const t = useT()
  const p = t.products
  // The chosen chip lives in the URL: it survives opening a product and
  // coming back, and the Categories page can link straight to a category.
  // One at a time: All, Hidden (?status=inactive) or a category.
  const [params, setParams] = useSearchParams()
  const hiddenOnly = params.get('status') === 'inactive'
  const categoryId = hiddenOnly ? '' : (params.get('category') ?? '')
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

  const choose = (chip: Chip) =>
    setParams(chip === 'all' ? {} : chip === 'hidden' ? { status: 'inactive' } : { category: chip.id }, {
      replace: true,
    })

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
  const category = categories.data?.find((c) => c.id === categoryId)
  // A category deleted since the link was made: all products.
  const filterId = categories.data && !category ? '' : categoryId
  const shown = all.filter(
    (p) => (hiddenOnly ? p.status === 'inactive' : true) && (!filterId || p.category_id === filterId),
  )

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

      <FilterChips
        products={all}
        categories={categories.data ?? []}
        chosen={hiddenOnly ? 'hidden' : (category ?? (filterId ? null : 'all'))}
        onChoose={choose}
      />

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
            {shown.map((product, i) => (
              <ProductRow
                key={product.id}
                product={product}
                eager={i < EAGER_PHOTOS}
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

type Chip = 'all' | 'hidden' | Category

/** All, Hidden (only while something is), then each category with its
 * count, as one row of chips that scrolls sideways on phones like the
 * shop's (founder's pick 1B, 2026-11-03). `chosen` null: a category link
 * while the categories load. Phones end with Categories, which their tab
 * bar has no room for; laptops have it in the sidebar.
 *
 * Tapping a chip glides the row until it's in the middle, and the navy
 * slides over to it (founder, 2026-11-03). The navy is a copy of the
 * chips, all navy with white words, seen through a pill-shaped window
 * over the chosen one: as the window slides, a chip it passes shows
 * white on navy too, never dark words on navy. */
function FilterChips({
  products,
  categories,
  chosen,
  onChoose,
}: {
  products: Product[]
  categories: Category[]
  chosen: Chip | null
  onChoose: (chip: Chip) => void
}) {
  const p = useT().products
  const row = useRef<HTMLDivElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const navy = useRef<HTMLDivElement>(null)
  // The chip the window was last opened over (null: none yet, or none chosen).
  const placed = useRef<string | null>(null)
  const key = chosen === null || typeof chosen === 'string' ? chosen : chosen.id
  const hidden = products.filter((product) => product.status === 'inactive').length
  const chips: { id: string; value: Chip; label: ReactNode; count: number }[] = [
    { id: 'all', value: 'all', label: p.all, count: products.length },
    ...(hidden > 0 || key === 'hidden'
      ? [
          {
            id: 'hidden',
            value: 'hidden' as const,
            label: (
              <>
                <EyeOff aria-hidden className="size-4" />
                {p.hidden}
              </>
            ),
            count: hidden,
          },
        ]
      : []),
    ...categories.map((category) => ({
      id: category.id,
      value: category,
      label: category.name,
      count: products.filter((product) => product.category_id === category.id).length,
    })),
  ]

  // The chosen chip in the middle of the row: there at once when the page
  // opens (a category link, or back from a product), gliding there when
  // another chip is tapped.
  useLayoutEffect(() => {
    centreChosen(row.current, row.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? null, placed.current !== null)
  }, [key])

  // The window follows the chosen chip after every render (counts and the
  // language change the chips' widths), sliding only when the choice did…
  useLayoutEffect(() => {
    if (!band.current || !navy.current) return
    openWindow(band.current, navy.current, placed.current !== null && placed.current !== key)
    placed.current = key
  })
  // …and as the fonts load, or a laptop's window narrows and they wrap.
  const chipIds = chips.map((c) => c.id).join()
  useEffect(() => {
    const box = band.current
    const copy = navy.current
    const list = box?.firstElementChild
    if (!box || !copy || !list) return
    const watch = new ResizeObserver(() => openWindow(box, copy, false))
    for (const item of [box, ...list.children]) watch.observe(item)
    return () => watch.disconnect()
  }, [chipIds])

  const CHIP =
    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap'
  const white = `${CHIP} border-slate-300 bg-surface text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100`
  return (
    <div
      ref={row}
      role="group"
      aria-label={p.filterCategory}
      // Only All on a laptop (no categories, nothing hidden): nothing to choose.
      className={`-mx-4 mb-4 overflow-x-auto [scrollbar-width:none] max-lg:fade-x lg:mx-0 ${
        categories.length === 0 && hidden === 0 ? 'lg:hidden' : ''
      }`}
    >
      <div ref={band} className="relative w-max lg:w-auto">
        <ul className="flex gap-2 px-4 lg:flex-wrap lg:px-0">
          {chips.map(({ id, value, label, count }) => (
            <li key={id}>
              <button type="button" aria-pressed={key === id} onClick={() => onChoose(value)} className={white}>
                {label}
                <span className="font-normal text-slate-500 tabular-nums">{count}</span>
              </button>
            </li>
          ))}
          <li className="lg:hidden">
            <Link to="/dashboard/categories" className={`${white} border-dashed`}>
              <Tags aria-hidden className="size-4" />
              {categories.length > 0 ? p.editCategories : p.addCategories}
            </Link>
          </li>
        </ul>
        {/* The navy copy, laid out exactly as the chips above (the same
            row, gaps and wrapping; Categories at the end changes no
            chip's place, so it's left out). Navy between the chips too,
            so the window is one pill as it crosses a gap. Shut until
            placed. */}
        <div
          ref={navy}
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex gap-2 bg-accent px-4 transition-[clip-path] [clip-path:inset(50%)] lg:flex-wrap lg:px-0 ${GLIDE}`}
        >
          {chips.map(({ id, label, count }) => (
            <span key={id} className={`${CHIP} border-accent bg-accent text-on-accent`}>
              {label}
              <span className="font-normal tabular-nums opacity-75">{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// The window's slide.
const GLIDE = 'duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]'

/** Opens the navy copy's window over the chosen chip (a pill the chip's
 * size), sliding there or not; shut while no chip is chosen. Left alone
 * when it's already there, so a slide that's playing isn't cut short. */
function openWindow(band: HTMLElement, navy: HTMLElement, slide: boolean) {
  const chosen = band.querySelector<HTMLElement>('[aria-pressed="true"]')
  navy.hidden = !chosen
  if (!chosen) return
  const box = band.getBoundingClientRect()
  const at = chosen.getBoundingClientRect()
  const clip = `inset(${at.top - box.top}px ${box.right - at.right}px ${box.bottom - at.bottom}px ${at.left - box.left}px round 9999px)`
  if (navy.dataset.clip === clip) return
  navy.dataset.clip = clip
  navy.style.transitionDuration = slide ? '' : '0s'
  navy.style.clipPath = clip
}

/** Few left: amber with the number; none: red; hidden: grey (with its
 * stock, which still matters once it's shown again). "Few" is the
 * seller's own low-stock alert level (Settings → Alerts). */
function useStock(product: Product): { tone: 'neutral' | 'amber' | 'red'; text: string } {
  const p = useT().products
  const level = useStore().data?.low_stock_alert ?? DEFAULT_LOW_STOCK
  const stock = totalStock(product)
  if (stock === 0) return { tone: 'red', text: p.outOfStock }
  if (stock <= level) return { tone: 'amber', text: p.onlyLeft(stock) }
  return { tone: 'neutral', text: p.inStock(stock) }
}

function StockTag({ product }: { product: Product }) {
  const { tone, text } = useStock(product)
  return <Badge tone={tone}>{text}</Badge>
}

/** The same in a card's or row's grey details: plain grey words, amber
 * or red (as StockTag) only when they need the seller. */
function StockWords({ product }: { product: Product }) {
  const { tone, text } = useStock(product)
  return <span className={tone === 'neutral' ? undefined : `font-semibold ${STOCK_WORDS[tone]}`}>{text}</span>
}

const STOCK_WORDS = { amber: 'text-amber-700', red: 'text-red-700' }

// A new shop's level, as the backend's notifications.DEFAULT_LOW_STOCK.
const DEFAULT_LOW_STOCK = 5

/** Photos, each card as tall as its photo (no cropping to a square),
 * packed in columns like a photo wall (`deal`, as the shop's). The cards
 * look like Taobao's (founder's pick 2A, 2026-11-03): flat, 8px apart and
 * from a phone's edges; the name on one line, the price on one line in
 * one size (the founder's pick over big dollars and small cents), a green
 * line for a sale today, then stock and variants in grey. */
function ProductGrid({ products, currency }: { products: Product[]; currency: Currency }) {
  const p = useT().products
  const count = useColumnCount()
  return (
    <div className="-mx-2 flex gap-2 sm:mx-0 sm:gap-3">
      {deal(products, count).map((column, c) => (
        <ul key={c} className="min-w-0 flex-1">
          {column.map((product, row) => {
            const hidden = product.status === 'inactive'
            // Its place in the list: the first ones' photos load at once.
            const eager = row * count + c < EAGER_PHOTOS
            const sale = lowestSalePrice(product)
            return (
              <li key={product.id} className="pb-2 sm:pb-3">
                <Link
                  to={`/dashboard/products/${product.id}`}
                  className="block overflow-hidden rounded-xl bg-surface ring-1 ring-slate-900/6 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-[0.98]"
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
                        loading={eager ? 'eager' : 'lazy'}
                        fetchPriority={eager ? 'high' : undefined}
                        className={`block h-auto w-full ${hidden ? 'opacity-50' : ''}`}
                      />
                    ) : (
                      <NoPhoto className="aspect-square w-full" />
                    )}
                    {hidden && (
                      <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {p.hiddenFromShop}
                      </span>
                    )}
                  </span>
                  <span className="block px-2.5 pt-2 pb-2.5">
                    <span className="block truncate text-[15px] leading-[22px] text-slate-900">{product.name}</span>
                    {sale !== null && (
                      <span className="mt-0.5 block text-[13px] leading-[18px] font-medium text-emerald-700">
                        {(product.has_variants ? p.saleFrom : p.sale)(formatMoney(sale, currency))}
                      </span>
                    )}
                    {/* 14px, a little tight: "$2,149.00 – $2,349.00" fits a
                        card on one line down to a 375px phone (149 of 156px). */}
                    <span className="mt-0.5 block text-sm leading-[22px] font-semibold tracking-tight text-slate-900 tabular-nums">
                      {priceLabel(product, currency)}
                    </span>
                    <DotList className="mt-0.5 text-xs text-slate-500">
                      <StockWords product={product} />
                      {product.has_variants && <span>{p.variantCount(product.variants.length)}</span>}
                    </DotList>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ))}
    </div>
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
          {sorted.map((product, i) => (
            <tr key={product.id} className="relative transition-colors hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <Thumb product={product} eager={i < EAGER_PHOTOS} className="size-11" />
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

function Thumb({ product, eager = false, className }: { product: Product; eager?: boolean; className: string }) {
  const hidden = product.status === 'inactive'
  return product.image_urls[0] ? (
    <img
      src={thumbnailUrl(product.image_urls[0])}
      onError={(e) => {
        const full = product.image_urls[0]
        if (e.currentTarget.src !== full) e.currentTarget.src = full
      }}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      // max-w-none: the base img rule (max-width: 100%) squeezes it to a
      // narrow strip inside the desktop table's photo column.
      className={`max-w-none shrink-0 rounded-xl object-cover ${hidden ? 'opacity-50' : ''} ${className}`}
    />
  ) : (
    <NoPhoto className={`shrink-0 rounded-xl ${className}`} iconClassName="size-5" />
  )
}

/** Phones, List: a row per product (founder's pick 3A, 2026-11-03: the
 * name and price at 15px, the details at 13px, so Khmer in them is as
 * readable as in Khmer's own text-xs). */
function ProductRow({
  product,
  currency,
  category,
  eager,
}: {
  product: Product
  currency: Currency
  category?: string
  eager: boolean
}) {
  const p = useT().products
  return (
    <Link
      to={`/dashboard/products/${product.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <Thumb product={product} eager={eager} className="size-14" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] leading-5 font-medium text-slate-900">{product.name}</span>
        <span className="mt-0.5 block text-[15px] leading-5 font-semibold text-slate-900 tabular-nums">
          {priceLabel(product, currency)}
        </span>
        <DotList className="mt-1 text-[13px] leading-[18px] text-slate-500">
          {product.status === 'inactive' && <span className="font-semibold text-slate-600">{p.hiddenFromShop}</span>}
          <StockWords product={product} />
          {product.has_variants && <span>{p.variantCount(product.variants.length)}</span>}
          {category && <span>{category}</span>}
        </DotList>
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
      <Skeleton className="mb-4 h-10 w-full rounded-full" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 sm:p-4">
            <Skeleton className="size-14 rounded-xl" />
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
