import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Button, Card, ErrorMessage, Field, Input, Select, Spinner, TextArea } from '../../components/ui.tsx'
import { fieldError, formError } from '../../lib/errors.ts'
import { priceStep } from '../../lib/money.ts'
import type { Currency, Product, ProductStatus } from '../../lib/types.ts'
import { useCategories, useProduct, useSaveProduct, useStore } from '../queries.ts'
import { ProductImages } from './ProductImages.tsx'

type VariantDraft = { key: string; id?: string; name: string; sku: string; price_override: string; stock_quantity: string }

type Draft = {
  name: string
  slug: string
  description: string
  category_id: string
  price: string
  status: ProductStatus
  has_variants: boolean
  stock_quantity: string
  variants: VariantDraft[]
}

const blankVariant = (): VariantDraft => ({
  key: crypto.randomUUID(),
  name: '',
  sku: '',
  price_override: '',
  stock_quantity: '0',
})

function toDraft(product?: Product): Draft {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    category_id: product?.category_id ?? '',
    price: product?.price ?? '',
    status: product?.status ?? 'active',
    has_variants: product?.has_variants ?? false,
    stock_quantity: String(product?.stock_quantity ?? 0),
    variants: product?.variants.map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      price_override: v.price_override ?? '',
      stock_quantity: String(v.stock_quantity),
    })) ?? [blankVariant()],
  }
}

function toBody(draft: Draft, isNew: boolean) {
  return {
    name: draft.name,
    ...(isNew ? {} : { slug: draft.slug }),
    description: draft.description.trim() || null,
    category_id: draft.category_id || null,
    price: draft.price,
    status: draft.status,
    has_variants: draft.has_variants,
    stock_quantity: draft.has_variants ? null : Number(draft.stock_quantity || 0),
    variants: draft.has_variants
      ? draft.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku.trim() || null,
          price_override: v.price_override === '' ? null : v.price_override,
          stock_quantity: Number(v.stock_quantity || 0),
        }))
      : [],
  }
}

/** /dashboard/products/new and /dashboard/products/:productId */
export function ProductEdit() {
  const { productId } = useParams()
  const product = useProduct(productId)

  if (productId && product.isPending) return <Spinner />
  if (productId && product.error) return <ErrorMessage error={product.error} />
  return <ProductForm key={productId ?? 'new'} product={product.data} />
}

function ProductForm({ product }: { product?: Product }) {
  const isNew = !product
  const navigate = useNavigate()
  const location = useLocation()
  const store = useStore()
  const categories = useCategories()
  const save = useSaveProduct()
  const [draft, setDraft] = useState(() => toDraft(product))
  const [saved, setSaved] = useState(Boolean((location.state as { created?: boolean } | null)?.created))

  const currency: Currency = store.data?.currency ?? 'USD'
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false)
    setDraft((d) => ({ ...d, [key]: value }))
  }
  const setVariant = (key: string, change: Partial<VariantDraft>) =>
    set(
      'variants',
      draft.variants.map((v) => (v.key === key ? { ...v, ...change } : v)),
    )

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: product?.id, body: toBody(draft, isNew) },
      {
        onSuccess: (result) => {
          if (isNew) {
            navigate(`/dashboard/products/${result.id}`, { replace: true, state: { created: true } })
          } else {
            setDraft(toDraft(result))
            setSaved(true)
          }
        },
      },
    )
  }

  const fields = ['name', 'slug', 'description', 'category_id', 'price', 'stock_quantity']
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/products" className="text-sm text-slate-600 hover:text-slate-900">
          ← Products
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">{isNew ? 'Add product' : product.name}</h1>

      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-4">
          <Field label="Name" error={fieldError(save.error, 'name')}>
            <Input required maxLength={100} value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Description" error={fieldError(save.error, 'description')}>
            <TextArea maxLength={2000} value={draft.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Price (${currency})`} error={fieldError(save.error, 'price')}>
              <Input
                required
                type="number"
                inputMode="decimal"
                min="0"
                step={priceStep(currency)}
                value={draft.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </Field>
            <Field label="Category" error={fieldError(save.error, 'category_id')}>
              <Select value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">No category</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Visibility">
            <Select value={draft.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
              <option value="active">Active: shown in your shop</option>
              <option value="inactive">Hidden: not shown to customers</option>
            </Select>
          </Field>
          {!isNew && (
            <Field
              label="Link name"
              error={fieldError(save.error, 'slug')}
              hint="Used in this product's link. Changing it breaks links you already shared."
            >
              <Input required value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} />
            </Field>
          )}
        </Card>

        <Card className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={draft.has_variants}
              onChange={(e) => set('has_variants', e.target.checked)}
            />
            This product has variants (e.g. sizes or colors)
          </label>

          {!draft.has_variants && (
            <Field label="Stock quantity" error={fieldError(save.error, 'stock_quantity')}>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={draft.stock_quantity}
                onChange={(e) => set('stock_quantity', e.target.value)}
                className="sm:max-w-40"
              />
            </Field>
          )}

          {draft.has_variants && (
            <div className="space-y-3">
              {draft.variants.map((variant, index) => (
                <div key={variant.key} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                  <Field label={`Variant ${index + 1}`}>
                    <Input
                      required
                      placeholder="Red / M"
                      maxLength={100}
                      value={variant.name}
                      onChange={(e) => setVariant(variant.key, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="Stock">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={variant.stock_quantity}
                      onChange={(e) => setVariant(variant.key, { stock_quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="Price">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={priceStep(currency)}
                      placeholder={draft.price || 'Same'}
                      value={variant.price_override}
                      onChange={(e) => setVariant(variant.key, { price_override: e.target.value })}
                    />
                  </Field>
                  <Field label="SKU">
                    <Input
                      placeholder="Optional"
                      maxLength={64}
                      value={variant.sku}
                      onChange={(e) => setVariant(variant.key, { sku: e.target.value })}
                    />
                  </Field>
                  <Button
                    variant="secondary"
                    aria-label={`Remove variant ${index + 1}`}
                    disabled={draft.variants.length === 1}
                    onClick={() => set('variants', draft.variants.filter((v) => v.key !== variant.key))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <p className="text-xs text-slate-500">Leave a variant's price empty to use the product price.</p>
              <Button variant="secondary" onClick={() => set('variants', [...draft.variants, blankVariant()])}>
                Add variant
              </Button>
            </div>
          )}
        </Card>

        <ErrorMessage error={formError(save.error, fields)} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </Button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>
      </form>

      {product ? (
        <ProductImages product={product} />
      ) : (
        <p className="text-sm text-slate-500">You can add photos after creating the product.</p>
      )}
    </div>
  )
}
