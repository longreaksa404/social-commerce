import { useState } from 'react'
import { Link } from 'react-router'
import { Card, ErrorMessage, Select, Spinner } from '../../components/ui.tsx'
import { formatMoney } from '../../lib/money.ts'
import type { Currency, Product } from '../../lib/types.ts'
import { useCategories, useProducts, useStore } from '../queries.ts'

type StatusFilter = 'all' | 'active' | 'inactive'

export function ProductList() {
  const products = useProducts()
  const categories = useCategories()
  const store = useStore()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [categoryId, setCategoryId] = useState('')

  const currency = store.data?.currency ?? 'USD'
  const categoryName = new Map(categories.data?.map((c) => [c.id, c.name]))
  const shown = (products.data ?? []).filter(
    (p) => (status === 'all' || p.status === status) && (!categoryId || p.category_id === categoryId),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Products</h1>
        <Link
          to="/dashboard/products/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Add product
        </Link>
      </div>

      {products.data && products.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
            {(['all', 'active', 'inactive'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-md px-3 py-1.5 ${status === value ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                {{ all: 'All', active: 'Active', inactive: 'Hidden' }[value]}
              </button>
            ))}
          </div>
          {categories.data && categories.data.length > 0 && (
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="!w-auto" aria-label="Category">
              <option value="">All categories</option>
              {categories.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {products.isPending && <Spinner />}
      <ErrorMessage error={products.error} />
      {products.data?.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-700">No products yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add your first product to start building your shop.</p>
        </Card>
      )}
      {products.data && products.data.length > 0 && shown.length === 0 && (
        <p className="text-sm text-slate-500">No products match these filters.</p>
      )}
      {shown.length > 0 && (
        <Card className="divide-y divide-slate-100 !p-0">
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
    </div>
  )
}

function ProductRow({ product, currency, category }: { product: Product; currency: Currency; category?: string }) {
  return (
    <Link to={`/dashboard/products/${product.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 sm:p-4">
      {product.image_urls[0] ? (
        <img src={product.image_urls[0]} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="size-14 shrink-0 rounded-lg bg-slate-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-slate-900">{product.name}</p>
          {product.status === 'inactive' && (
            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">Hidden</span>
          )}
        </div>
        <p className="text-sm text-slate-600">{priceLabel(product, currency)}</p>
        <p className="text-xs text-slate-500">
          {stockLabel(product)}
          {category && ` · ${category}`}
        </p>
      </div>
    </Link>
  )
}

function priceLabel(product: Product, currency: Currency): string {
  const prices = product.has_variants
    ? product.variants.map((v) => Number(v.price_override ?? product.price))
    : [Number(product.price)]
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return low === high ? formatMoney(low, currency) : `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`
}

function stockLabel(product: Product): string {
  const stock = product.has_variants
    ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
    : (product.stock_quantity ?? 0)
  const variants = product.has_variants ? `${product.variants.length} variants · ` : ''
  return stock === 0 ? `${variants}Out of stock` : `${variants}${stock} in stock`
}
