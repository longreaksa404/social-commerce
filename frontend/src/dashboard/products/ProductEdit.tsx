import { Minus, Plus, Share2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass, cardClass } from '../../components/styles.ts'
import {
  Button,
  ErrorMessage,
  ErrorState,
  Field,
  IconButton,
  Input,
  MoneyInput,
  PageHeader,
  SavedNote,
  Section,
  Select,
  Skeleton,
  Switch,
  TextArea,
} from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { errorText, fieldError, formError } from '../../lib/errors.ts'
import { uploadProductImage } from '../../lib/images.ts'
import type { Currency, Product, ProductStatus } from '../../lib/types.ts'
import { useCategories, useProduct, useSaveProduct, useStore } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'
import { NewProductPhotos, ProductPhotos, type LocalPhoto } from './ProductPhotos.tsx'
import { VariantList, type VariantDraft } from './VariantList.tsx'


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
    variants: product?.variants.length
      ? product.variants.map((v) => ({
          key: v.id,
          id: v.id,
          name: v.name,
          sku: v.sku ?? '',
          price_override: v.price_override ?? '',
          stock_quantity: String(v.stock_quantity),
        }))
      : [blankVariant()],
  }
}

/** The request body. Given `saved` (the product as loaded), stock the
 * seller didn't change is left out, so the server keeps its current value:
 * orders placed while the form was open have already taken from it. */
function toBody(draft: Draft, isNew: boolean, saved?: Draft) {
  const savedStock = new Map(saved?.variants.map((v) => [v.id, v.stock_quantity]))
  const keepStock = saved && !saved.has_variants && !draft.has_variants && draft.stock_quantity === saved.stock_quantity
  return {
    name: draft.name.trim(),
    ...(isNew ? {} : { slug: draft.slug }),
    description: draft.description.trim() || null,
    category_id: draft.category_id || null,
    price: draft.price,
    status: draft.status,
    has_variants: draft.has_variants,
    ...(keepStock ? {} : { stock_quantity: draft.has_variants ? null : Number(draft.stock_quantity || 0) }),
    variants: draft.has_variants
      ? draft.variants.map((v) => ({
          id: v.id,
          name: v.name.trim(),
          sku: v.sku.trim() || null,
          price_override: v.price_override === '' ? null : v.price_override,
          ...(v.id && savedStock.get(v.id) === v.stock_quantity
            ? {}
            : { stock_quantity: Number(v.stock_quantity || 0) }),
        }))
      : [],
  }
}

const sameBody = (a: Draft, b: Draft, isNew: boolean) =>
  JSON.stringify(toBody(a, isNew)) === JSON.stringify(toBody(b, isNew))

/** /dashboard/products/new and /dashboard/products/:productId */
export function ProductEdit() {
  const { productId } = useParams()
  const product = useProduct(productId)
  const t = useT()

  if (productId && product.isPending) return <FormSkeleton />
  if (productId && product.error) {
    return (
      <>
        <PageHeader title={t.products.product} back="/dashboard/products" />
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      </>
    )
  }
  return <ProductForm key={productId ?? 'new'} product={product.data} />
}

function ProductForm({ product }: { product?: Product }) {
  const isNew = !product
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const store = useStore()
  const categories = useCategories()
  const save = useSaveProduct()
  const [baseline, setBaseline] = useState(() => toDraft(product))
  const [draft, setDraft] = useState(baseline)
  const [newPhotos, setNewPhotos] = useState<LocalPhoto[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const t = useT()
  const p = t.products

  const dirty = !sameBody(draft, baseline, isNew) || newPhotos.length > 0
  const { allowLeave } = useUnsavedChanges(dirty)

  const currency: Currency = store.data?.currency ?? 'USD'
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    let saved: Product
    try {
      setProgress(t.common.saving)
      saved = await save.mutateAsync({ id: product?.id, body: toBody(draft, isNew, isNew ? undefined : baseline) })
    } catch {
      setProgress(null)
      return // shown via save.error
    }

    if (!isNew) {
      setProgress(null)
      setBaseline(toDraft(saved))
      setDraft(toDraft(saved))
      toast(p.changesSaved)
      return
    }

    // New product: upload the photos picked before it existed.
    allowLeave()
    try {
      const urls: string[] = []
      for (const [i, photo] of newPhotos.entries()) {
        setProgress(p.uploadingPhotoOf(i + 1, newPhotos.length))
        urls.push(await uploadProductImage(saved.id, photo.photo))
      }
      if (urls.length) await save.mutateAsync({ id: saved.id, body: { image_urls: urls } })
      newPhotos.forEach((p) => URL.revokeObjectURL(p.preview))
      toast(p.productAdded)
      navigate('/dashboard/products', { replace: true })
    } catch (err) {
      const reason = err instanceof ApiError ? errorText(err) : t.common.somethingWrong
      toast(p.photosNotUploaded(reason), 'error')
      navigate(`/dashboard/products/${saved.id}`, { replace: true })
    }
  }

  const busy = progress !== null
  const fields = ['name', 'slug', 'description', 'category_id', 'price', 'stock_quantity']
  const slugError = fieldError(save.error, 'slug')

  return (
    <>
      <PageHeader
        title={isNew ? p.newProduct : p.editProduct}
        back="/dashboard/products"
        action={
          // A hidden product's page doesn't open, so there's nothing to share.
          product &&
          baseline.status === 'active' && (
            <Link to={`/dashboard/links/new?product=${product.id}`} className={`${buttonClass('secondary')} shrink-0`}>
              <Share2 aria-hidden className="size-4" />
              {t.common.share}
            </Link>
          )
        }
      />

      <form onSubmit={submit} className="space-y-4">
        <Section
          title={p.photos}
          description={isNew ? p.photosHintNew : p.photosHintSaved}
        >
          {isNew ? <NewProductPhotos photos={newPhotos} onChange={setNewPhotos} /> : <ProductPhotos product={product} />}
        </Section>

        <Section title={p.details}>
          <Field label={p.name} error={fieldError(save.error, 'name')}>
            <Input
              required
              maxLength={100}
              autoCapitalize="sentences"
              placeholder={p.namePlaceholder}
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label={p.description} hint={p.descriptionHint} error={fieldError(save.error, 'description')}>
            <TextArea
              rows={4}
              maxLength={2000}
              autoCapitalize="sentences"
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <Field
            label={p.category}
            error={fieldError(save.error, 'category_id')}
            hint={
              categories.data?.length === 0 ? (
                <>
                  {p.noCategoriesYet}{' '}
                  <Link to="/dashboard/categories" className="font-medium text-emerald-700 underline">
                    {p.createOne}
                  </Link>
                </>
              ) : undefined
            }
          >
            <Select value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">{p.noCategory}</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title={p.priceAndStock}>
          <Field label={p.price} error={fieldError(save.error, 'price')}>
            <MoneyInput required currency={currency} value={draft.price} onChange={(v) => set('price', v)} />
          </Field>

          <Switch
            checked={draft.has_variants}
            onChange={(on) => set('has_variants', on)}
            label={p.hasVariants}
            description={p.hasVariantsHint}
          />

          {draft.has_variants ? (
            <VariantList
              variants={draft.variants}
              currency={currency}
              productPrice={draft.price}
              onChange={(variants) => set('variants', variants)}
              onAdd={() => set('variants', [...draft.variants, blankVariant()])}
            />
          ) : (
            <Field label={p.stock} error={fieldError(save.error, 'stock_quantity')} hint={p.stockHint}>
              <StockStepper value={draft.stock_quantity} onChange={(v) => set('stock_quantity', v)} />
            </Field>
          )}
        </Section>

        <Section title={p.visibility}>
          <Switch
            checked={draft.status === 'active'}
            onChange={(on) => set('status', on ? 'active' : 'inactive')}
            label={p.showInShop}
            description={draft.status === 'active' ? p.shownHint : p.hiddenHint}
          />
        </Section>

        {!isNew && (
          <details open={slugError ? true : undefined} className={`group px-4 sm:px-6 ${cardClass}`}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-base font-semibold text-slate-900">
              {p.advanced}
              <Plus aria-hidden className="size-5 text-slate-400 transition-transform group-open:rotate-45" />
            </summary>
            <div className="pb-5">
              <Field label={p.linkName} error={slugError} hint={p.linkNameHint}>
                <Input
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={draft.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase())}
                />
              </Field>
            </div>
          </details>
        )}

        <ErrorMessage error={formError(save.error, fields)} />

        {/* Pinned to the bottom on phones so Save is always in reach. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:pb-0">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 lg:px-0">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-500" aria-live="polite">
              {progress ??
                (dirty ? t.common.unsaved : isNew ? '' : <SavedNote key={save.submittedAt} justSaved={save.isSuccess} />)}
            </span>
            <Button type="submit" loading={busy} disabled={!isNew && !dirty} className="min-w-32">
              {isNew ? p.addProduct : t.common.save}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

/** Number field with − / + buttons: quick stock changes with a thumb. */
function StockStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const n = Number(value || 0)
  const p = useT().products
  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon={Minus}
        label={p.decreaseStock}
        disabled={n <= 0}
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="border border-slate-300 bg-surface shadow-xs"
      />
      <Input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={value}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 text-center"
      />
      <IconButton
        icon={Plus}
        label={p.increaseStock}
        onClick={() => onChange(String(n + 1))}
        className="border border-slate-300 bg-surface shadow-xs"
      />
    </div>
  )
}

function FormSkeleton() {
  const p = useT().products
  return (
    <>
      <PageHeader title={p.editProduct} back="/dashboard/products" />
      <div className="space-y-4">
        {[120, 260, 180].map((h) => (
          <Skeleton key={h} className="w-full rounded-2xl" style={{ height: h }} />
        ))}
      </div>
    </>
  )
}
