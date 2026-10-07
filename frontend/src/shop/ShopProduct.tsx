import { ChevronLeft, ChevronRight, Send, ShoppingBag } from 'lucide-react'
import { useRef, useState, type Ref, type RefObject } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { buzz } from '../components/effects.ts'
import { useFeedback } from '../components/feedback.ts'
import { Button, ErrorState, Skeleton } from '../components/ui.tsx'
import { buttonClass, cardClass } from '../components/styles.ts'
import { formatMoney, formatPriceRange } from '../lib/money.ts'
import { useT } from '../i18n/useT.ts'
import type { ShopProduct as Product, ShopStore, ShopVariant } from '../lib/types.ts'
import { MAX_QUANTITY, useCart } from './cart.ts'
import { NotFound, ProductImage, QuantityStepper } from './components.tsx'
import { flyToCart } from './fly.ts'
import { isNotFound, useShop, useShopProduct } from './queries.ts'
import { ShopInfo } from './ShopInfo.tsx'

/** /shop/:storeSlug/product/:productSlug: the product link a seller shares. */
export function ShopProduct() {
  const { storeSlug = '', productSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const product = useShopProduct(storeSlug, productSlug)
  const t = useT()

  // A 404 before the shop has loaded may mean the shop is gone, which the
  // layout shows instead.
  if (product.error && !isNotFound(product.error)) {
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />
  }
  if (!shop.data) return <ProductSkeleton />
  if (isNotFound(product.error)) {
    return (
      <>
        <title>{t.shop.product.notFoundTab(shop.data.name)}</title>
        <NotFound
          title={t.shop.product.notFoundTitle}
          action={
            <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
              {t.shop.seeAllProducts}
            </Link>
          }
        >
          {t.shop.product.notFoundText}
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
  // Where Add to cart flies the photo from, while it's on screen.
  const photos = useRef<HTMLDivElement>(null)
  const t = useT()

  return (
    // Bottom padding on phones: room for the pinned Add to cart bar.
    <div className="pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:pb-0">
      <title>{`${product.name} · ${shop.name}`}</title>
      <Gallery ref={photos} images={product.image_urls} name={product.name} />
      <div className="mt-4 lg:mt-0">
        {product.category && (
          <Link
            to={`/shop/${shop.slug}/category/${product.category.slug}`}
            className="-mx-1 inline-flex min-h-8 items-center rounded px-1 text-sm font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
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
        <AddToCart shop={shop} product={product} variant={variant} photos={photos} />
        {shop.telegram_username && (
          <AskSeller username={shop.telegram_username} product={product} variant={variant} />
        )}
        <ShopInfo shop={shop} className="mt-6" />

        {product.description && (
          <div className={`mt-4 p-4 ${cardClass}`}>
            <h2 className="text-sm font-semibold text-slate-900">{t.shop.product.details}</h2>
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

function AddToCart({
  shop,
  product,
  variant,
  photos,
}: {
  shop: ShopStore
  product: Product
  variant: ShopVariant | null
  photos: RefObject<HTMLDivElement | null>
}) {
  const cart = useCart(shop.slug)
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [quantity, setQuantity] = useState(1)
  const t = useT()

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
  if (stock <= 0) blocked = t.shop.soldOut
  else if (product.has_variants && !variant) blocked = t.shop.product.chooseOptionFirst
  const full = blocked === null && room <= 0

  function add(button: HTMLElement) {
    flyToCart(...flightStart(photos.current, button))
    buzz()
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
  }

  const cartPath = `/shop/${shop.slug}/cart`
  return (
    <>
      {/* How many: beside the price, not in the bar, so the bar's two
          buttons get the whole width. */}
      {blocked === null && !full && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">{t.shop.quantity}</span>
          <QuantityStepper value={amount} max={Math.max(1, room)} onChange={setQuantity} />
        </div>
      )}
      {/* Pinned to the bottom of the screen on phones, so it stays one tap
          away while reading the details; in place on wide screens. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl gap-3 px-4 py-3 lg:p-0">
          {blocked !== null ? (
            <Button size="lg" disabled className="flex-1">
              {blocked}
            </Button>
          ) : full ? (
            // All the stock is in the cart already: the way there.
            <Link to={cartPath} className={`${buttonClass('primary', 'lg')} flex-1`}>
              {t.shop.product.allInCart}: {t.shop.product.viewCart(cart.count)}
            </Link>
          ) : (
            <>
              <Button
                size="lg"
                variant="secondary"
                icon={ShoppingBag}
                onClick={(event) => {
                  add(event.currentTarget)
                  toast(t.shop.product.added)
                }}
                className="flex-1"
              >
                {t.shop.product.addToCart}
              </Button>
              {/* Most customers from a post want just this: into the cart
                  and straight to ordering. */}
              <Button
                size="lg"
                onClick={(event) => {
                  add(event.currentTarget)
                  navigate(cartPath)
                }}
                className="flex-1"
              >
                {t.shop.product.buyNow}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/** The photo showing, if most of it is on screen (under the header, above
 * the pinned bar); else the button itself, with the first photo. */
function flightStart(photos: HTMLDivElement | null, button: HTMLElement): [Element, string | null] {
  const box = photos?.getBoundingClientRect()
  const img = photos?.querySelectorAll('img')[Number(photos.dataset.index ?? 0)]
  if (box && img?.currentSrc && box.top + box.height / 3 > 56 && box.bottom - box.height / 3 < innerHeight - 96) {
    return [photos!, img.currentSrc]
  }
  const first = photos?.querySelector('img')?.currentSrc
  return [button, first || null]
}

/** Opens a Telegram chat with the seller's own account, the question
 * started for them. Ordering stays on the shop (01_PRODUCT.md section 11). */
function AskSeller({ username, product, variant }: { username: string; product: Product; variant: ShopVariant | null }) {
  const t = useT()
  const name = variant ? `${product.name} (${variant.name})` : product.name
  const text = t.shop.product.askSellerText(name, window.location.href)
  return (
    <a
      href={`https://t.me/${username}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
      className={`${buttonClass('secondary')} mt-5 w-full lg:mt-3`}
    >
      <Send aria-hidden className="size-4" />
      {t.shop.product.askSeller}
    </a>
  )
}

/** Few left shows the number; plenty just says in stock. */
const LOW_STOCK = 5

function StockLine({ product, variant }: { product: Product; variant: ShopVariant | null }) {
  const t = useT()
  let quantity: number | null
  if (variant) quantity = variant.stock_quantity
  else if (!product.has_variants) quantity = product.stock_quantity ?? 0
  // No option chosen yet: only worth saying if every option is gone.
  else quantity = product.variants.some((v) => v.stock_quantity > 0) ? null : 0
  if (quantity === null) return null

  const [text, dot, color] =
    quantity <= 0
      ? [t.shop.soldOut, 'bg-red-500', 'text-red-700']
      : quantity <= LOW_STOCK
        ? [t.shop.onlyLeft(quantity), 'bg-amber-500', 'text-amber-800']
        : [t.shop.inStock, 'bg-emerald-500', 'text-emerald-800']
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
  const t = useT()
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-semibold text-slate-900">{t.shop.product.chooseOption}</legend>
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
              <span className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-surface px-4 text-sm font-medium text-slate-800 transition-colors peer-checked:border-navy-700 peer-checked:bg-navy-50 peer-checked:text-navy-800 peer-checked:ring-1 peer-checked:ring-navy-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600 peer-disabled:border-slate-200 peer-disabled:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-slate-300)_50%,transparent_calc(50%+0.5px))] peer-disabled:text-slate-400">
                {v.name}
                {soldOut && <span className="sr-only">{t.shop.product.optionSoldOut}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Swipeable photos on phones; arrows for mouse users on wider screens. */
function Gallery({ images, name, ref }: { images: string[]; name: string; ref: Ref<HTMLDivElement> }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const t = useT()
  const frame = '-mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-2xl'

  if (images.length <= 1) {
    return (
      <div ref={ref} className={frame}>
        <ProductImage src={images[0]} alt={name} eager className="aspect-square w-full" />
      </div>
    )
  }

  const show = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div ref={ref} data-index={index} className={`relative ${frame}`} role="region" aria-label={t.shop.product.photos}>
      {/* Focusable so keyboard users can scroll it with the arrow keys. */}
      <div
        ref={track}
        tabIndex={0}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
      >
        {images.map((src, i) => (
          <ProductImage
            key={src}
            src={src}
            alt={t.shop.product.photoOf(name, i + 1, images.length)}
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
            aria-label={t.shop.product.showPhoto(i + 1)}
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
        { label: t.shop.product.previousPhoto, icon: ChevronLeft, to: index - 1, side: 'left-3' },
        { label: t.shop.product.nextPhoto, icon: ChevronRight, to: index + 1, side: 'right-3' },
      ].map(({ label, icon: Icon, to, side }) => (
        <button
          key={label}
          type="button"
          onClick={() => show(to)}
          disabled={to < 0 || to >= images.length}
          aria-label={label}
          className={`absolute top-1/2 ${side} hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-slate-800 shadow transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-navy-600 disabled:opacity-0 sm:flex`}
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
