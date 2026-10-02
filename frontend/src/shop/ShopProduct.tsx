import { ChevronLeft, ChevronRight, CircleCheck, ShoppingBag } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button, ErrorState, Skeleton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { formatMoney, formatPriceRange } from '../lib/money.ts'
import type { ShopProduct as Product, ShopStore, ShopVariant } from '../lib/types.ts'
import { MAX_QUANTITY, useCart } from './cart.ts'
import { NotFound, ProductImage, QuantityStepper } from './components.tsx'
import { isNotFound, useShop, useShopProduct } from './queries.ts'

/** /shop/:storeSlug/product/:productSlug: the product link a seller shares. */
export function ShopProduct() {
  const { storeSlug = '', productSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const product = useShopProduct(storeSlug, productSlug)

  // A 404 before the shop has loaded may mean the shop is gone, which the
  // layout shows instead.
  if (product.error && !isNotFound(product.error)) {
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />
  }
  if (!shop.data) return <ProductSkeleton />
  if (isNotFound(product.error)) {
    return (
      <>
        <title>{`Product not available · ${shop.data.name}`}</title>
        <NotFound
          title="This product isn't available"
          action={
            <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
              See all products
            </Link>
          }
        >
          It may have been sold or removed. The shop may have something similar.
        </NotFound>
      </>
    )
  }
  if (!product.data) return <ProductSkeleton />
  // Keyed so the chosen option resets when moving to another product.
  return <ProductView key={product.data.id} shop={shop.data} product={product.data} />
}

function ProductView({ shop, product }: { shop: ShopStore; product: Product }) {
  const [variantId, setVariantId] = useState<string | null>(() =>
    product.variants.length === 1 ? product.variants[0].id : null,
  )
  const variant = product.variants.find((v) => v.id === variantId) ?? null

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
      <title>{`${product.name} · ${shop.name}`}</title>
      <Gallery images={product.image_urls} name={product.name} />
      <div className="mt-4 lg:mt-0">
        {product.category && (
          <Link
            to={`/shop/${shop.slug}/category/${product.category.slug}`}
            className="-mx-1 inline-flex min-h-8 items-center rounded px-1 text-sm font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {product.category.name}
          </Link>
        )}
        <h1 className="text-xl font-bold leading-snug tracking-tight break-words text-slate-900 sm:text-2xl">
          {product.name}
        </h1>
        <p className="mt-2 text-2xl font-bold text-slate-900">{priceText(product, variant, shop)}</p>
        <StockLine product={product} variant={variant} />

        {product.has_variants && (
          <VariantPicker variants={product.variants} value={variantId} onChange={setVariantId} />
        )}
        <AddToCart shop={shop} product={product} variant={variant} />

        {product.description && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            <p className="mt-2 text-[15px] leading-7 whitespace-pre-line break-words text-slate-700">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function priceText(product: Product, variant: ShopVariant | null, shop: ShopStore) {
  if (variant) return formatMoney(variant.price, shop.currency)
  if (!product.has_variants) return formatMoney(product.price, shop.currency)
  const prices = product.variants.map((v) => Number(v.price))
  return formatPriceRange(Math.min(...prices), Math.max(...prices), shop.currency)
}

function AddToCart({ shop, product, variant }: { shop: ShopStore; product: Product; variant: ShopVariant | null }) {
  const cart = useCart(shop.slug)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const variantId = variant?.id ?? null
  const stock = variant
    ? variant.stock_quantity
    : product.has_variants
      ? Math.max(0, ...product.variants.map((v) => v.stock_quantity))
      : (product.stock_quantity ?? 0)
  // How many more can go in the cart: what's in stock, less what's there.
  const room = Math.min(MAX_QUANTITY, stock) - cart.quantityOf(product.id, variantId)
  const amount = Math.max(1, Math.min(quantity, room))

  let blocked: string | null = null
  if (stock <= 0) blocked = 'Sold out'
  else if (product.has_variants && !variant) blocked = 'Choose an option'
  else if (room <= 0) blocked = 'All in your cart'

  function add() {
    cart.add({
      productId: product.id,
      variantId,
      quantity: amount,
      productSlug: product.slug,
      name: product.name,
      variantName: variant?.name ?? null,
      price: variant?.price ?? product.price,
      imageUrl: product.image_urls[0] ?? null,
    })
    setQuantity(1)
    setAdded(true)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <QuantityStepper value={amount} max={Math.max(1, room)} onChange={setQuantity} disabled={blocked !== null} />
        <Button size="lg" icon={ShoppingBag} disabled={blocked !== null} onClick={add} className="flex-1">
          {blocked ?? 'Add to cart'}
        </Button>
      </div>
      {added && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 py-1.5 pr-1.5 pl-3.5 text-sm font-medium text-emerald-800"
        >
          <CircleCheck aria-hidden className="size-4.5 shrink-0" />
          <span className="flex-1">Added to your cart</span>
          <Link to={`/shop/${shop.slug}/cart`} className={`${buttonClass('secondary')} shrink-0`}>
            View cart ({cart.count})
          </Link>
        </p>
      )}
    </div>
  )
}

/** Few left shows the number; plenty just says in stock. */
const LOW_STOCK = 5

function StockLine({ product, variant }: { product: Product; variant: ShopVariant | null }) {
  let quantity: number | null
  if (variant) quantity = variant.stock_quantity
  else if (!product.has_variants) quantity = product.stock_quantity ?? 0
  // No option chosen yet: only worth saying if every option is gone.
  else quantity = product.variants.some((v) => v.stock_quantity > 0) ? null : 0
  if (quantity === null) return null

  const [text, dot, color] =
    quantity <= 0
      ? ['Sold out', 'bg-red-500', 'text-red-700']
      : quantity <= LOW_STOCK
        ? [`Only ${quantity} left`, 'bg-amber-500', 'text-amber-800']
        : ['In stock', 'bg-emerald-500', 'text-emerald-800']
  return (
    <p className={`mt-1.5 flex items-center gap-2 text-sm font-medium ${color}`}>
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {text}
    </p>
  )
}

function VariantPicker({
  variants,
  value,
  onChange,
}: {
  variants: ShopVariant[]
  value: string | null
  onChange: (id: string) => void
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-semibold text-slate-900">Choose an option</legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const soldOut = v.stock_quantity <= 0
          return (
            <label key={v.id} className={soldOut ? 'cursor-not-allowed' : 'cursor-pointer'}>
              <input
                type="radio"
                name="variant"
                value={v.id}
                checked={value === v.id}
                disabled={soldOut}
                onChange={() => onChange(v.id)}
                className="peer sr-only"
              />
              {/* Sold out: crossed out with a diagonal line, not line-through,
                  which turns a one-letter size like "S" into "$". */}
              <span className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors peer-checked:border-emerald-700 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-checked:ring-1 peer-checked:ring-emerald-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600 peer-disabled:border-slate-200 peer-disabled:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-slate-300)_50%,transparent_calc(50%+0.5px))] peer-disabled:text-slate-400">
                {v.name}
                {soldOut && <span className="sr-only"> (sold out)</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Swipeable photos on phones; arrows for mouse users on wider screens. */
function Gallery({ images, name }: { images: string[]; name: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const frame = '-mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-2xl'

  if (images.length <= 1) {
    return (
      <div className={frame}>
        <ProductImage src={images[0]} alt={name} eager className="aspect-square w-full" />
      </div>
    )
  }

  const show = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={`relative ${frame}`} role="region" aria-label="Product photos">
      {/* Focusable so keyboard users can scroll it with the arrow keys. */}
      <div
        ref={track}
        tabIndex={0}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600"
      >
        {images.map((src, i) => (
          <ProductImage
            key={src}
            src={src}
            alt={`${name}, photo ${i + 1} of ${images.length}`}
            eager={i === 0}
            className="aspect-square w-full shrink-0 snap-center"
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => show(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === index || undefined}
            className="flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
          >
            <span
              className={`block size-2 rounded-full shadow transition-colors ${
                i === index ? 'bg-white' : 'bg-white/50'
              }`}
            />
          </button>
        ))}
      </div>
      {[
        { label: 'Previous photo', icon: ChevronLeft, to: index - 1, side: 'left-3' },
        { label: 'Next photo', icon: ChevronRight, to: index + 1, side: 'right-3' },
      ].map(({ label, icon: Icon, to, side }) => (
        <button
          key={label}
          type="button"
          onClick={() => show(to)}
          disabled={to < 0 || to >= images.length}
          aria-label={label}
          className={`absolute top-1/2 ${side} hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-0 sm:flex`}
        >
          <Icon aria-hidden className="size-5" />
        </button>
      ))}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div aria-hidden className="lg:grid lg:grid-cols-2 lg:gap-10">
      <Skeleton className="-mx-4 -mt-4 aspect-square rounded-none sm:mx-0 sm:mt-0 sm:rounded-2xl" />
      <div className="mt-4 lg:mt-0">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-3 h-7 w-3/4" />
        <Skeleton className="mt-3 h-8 w-24" />
        <Skeleton className="mt-6 h-11 w-full" />
      </div>
    </div>
  )
}
