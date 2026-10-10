/**
 * Link previews for shared shop links (Vercel Routing Middleware, runs
 * before the SPA). Facebook, Messenger, Telegram, TikTok and the like build
 * a link's preview card from the page's HTML without running JavaScript,
 * so without this every link shows the generic "Oak Order" card.
 *
 * Only for those preview bots: they get index.html with the shop's,
 * product's or category's title, description and photo filled in. People
 * go straight through to the app untouched, so a slow or sleeping API never
 * slows down a customer. If the API doesn't answer in time, the bot gets
 * the generic Oak Order card from index.html.
 *
 * Oak shows in every card (founder's picks 3B and 5B, 2026-10-10): titles
 * end in "· Oak Order", and the picture is the API's copy of the logo or
 * photo with our mark small in the corner (/shop/{slug}/preview/...); a
 * shop without a logo gets our plain mark (public/og/oak-mark.png).
 */
import { next } from '@vercel/functions'

export const config = { matcher: '/shop/:path*' }

// Preview fetchers, not browsers: in-app browsers (FBAN, TikTok's webview,
// Telegram's) don't match.
const PREVIEW_BOTS =
  /facebookexternalhit|facebookcatalog|meta-externalagent|telegrambot|twitterbot|whatsapp|slackbot|discordbot|linkedinbot|skypeuripreview|bytespider|tiktok.*bot|googlebot|bingbot|pinterest|embedly|redditbot|applebot|line-poker|viber|zalo/i

const API_TIMEOUT_MS = 6000
// The card's own words are in Khmer, the shop's default language (Phase 9).
const ORDER_ONLINE = 'កុម្ម៉ង់តាមអនឡាញ។'

type Currency = 'USD' | 'KHR'
type Store = { name: string; description: string | null; logo_url: string | null; currency: Currency }
type Product = {
  name: string
  description: string | null
  price: string
  image_urls: string[]
  variants: { price: string }[]
}
type CategoryPage = { category: { name: string }; products: { slug: string; image_url: string | null }[] }
// large: a wide 1200 × 630 card; otherwise a small square beside the words.
type Picture = { url: string; large: boolean; width?: number; height?: number }
type Preview = { title: string; description: string; picture: Picture }

export default async function middleware(request: Request) {
  if (!PREVIEW_BOTS.test(request.headers.get('user-agent') ?? '')) return next()

  const url = new URL(request.url)
  const page = await fetch(new URL('/index.html', url))
  if (!page.ok) return next()
  const html = await page.text()

  let preview: Preview | null = null
  try {
    preview = await describe(url)
  } catch {
    // API asleep or down, or no such page: the generic card.
  }
  return new Response(preview ? withPreview(html, preview, url.href) : html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Bots ask again for each share; keep the card fresh but cheap.
      'cache-control': 'public, max-age=300',
    },
  })
}

async function describe(url: URL): Promise<Preview | null> {
  // /shop/{store}, /shop/{store}/product/{slug}, /shop/{store}/category/{slug}
  const [, , storeSlug, kind, slug] = url.pathname.split('/').map(decodeURIComponent)
  if (!storeSlug) return null
  const shop = `/shop/${encodeURIComponent(storeSlug)}`
  const store = await api<Store>(shop)

  const shopPicture: Picture = store.logo_url
    ? { url: apiUrl(`${shop}/preview/logo?v=${version(store.logo_url)}`), large: false }
    : { url: new URL('/og/oak-mark.png', url).href, large: false, width: 512, height: 512 }
  const photoPicture = (productSlug: string, photo: string): Picture => ({
    url: apiUrl(`${shop}/preview/products/${encodeURIComponent(productSlug)}?v=${version(photo)}`),
    large: true,
    width: 1200,
    height: 630,
  })

  if (kind === 'product' && slug) {
    const product = await api<Product>(`${shop}/products/${encodeURIComponent(slug)}`)
    const prices = product.variants.length ? product.variants.map((v) => Number(v.price)) : [Number(product.price)]
    const price = priceRange(Math.min(...prices), Math.max(...prices), store.currency)
    const photo = product.image_urls[0]
    return {
      // The price in the title: apps often hide the description.
      title: `${product.name} · ${price}`,
      description: [store.name, product.description].filter(Boolean).join(' · '),
      picture: photo ? photoPicture(slug, photo) : shopPicture,
    }
  }
  if (kind === 'category' && slug) {
    const page = await api<CategoryPage>(`${shop}/categories/${encodeURIComponent(slug)}`)
    const count = page.products.length
    const first = page.products.find((p) => p.image_url)
    return {
      title: `${page.category.name} · ${store.name}`,
      description: `ទំនិញ ${count}។ ${ORDER_ONLINE}`,
      picture: first?.image_url ? photoPicture(first.slug, first.image_url) : shopPicture,
    }
  }
  if (kind && kind !== 'cart' && kind !== 'checkout') return null
  return { title: store.name, description: store.description || ORDER_ONLINE, picture: shopPicture }
}

function apiUrl(path: string): string {
  return `${process.env.VITE_API_URL ?? 'http://localhost:8000'}/api/v1${path}`
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { signal: AbortSignal.timeout(API_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`API ${response.status}`)
  return (await response.json()) as T
}

/** A short tag for a photo's address: a new logo or photo is a new picture
 * URL, so Facebook and Telegram don't keep showing the old one. */
function version(photoUrl: string): string {
  let hash = 0
  for (const char of photoUrl) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return (hash >>> 0).toString(36)
}

// Same as src/lib/money.ts (kept apart: this file is built on its own).
function money(value: number, currency: Currency): string {
  if (currency === 'KHR') return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}៛`
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function priceRange(low: number, high: number, currency: Currency): string {
  return low === high ? money(low, currency) : `${money(low, currency)} – ${money(high, currency)}`
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function shorten(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** index.html with the page's own title, description and picture, in
 * place of the generic Oak Order card's. */
function withPreview(html: string, preview: Preview, pageUrl: string): string {
  // Cut the page's own words, never "· Oak Order".
  const title = escapeHtml(`${shorten(preview.title, 80)} · Oak Order`)
  const description = escapeHtml(shorten(preview.description, 200))
  const { picture } = preview
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:site_name" content="Oak Order" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(picture.url)}" />`,
    ...(picture.width
      ? [
          `<meta property="og:image:width" content="${picture.width}" />`,
          `<meta property="og:image:height" content="${picture.height}" />`,
        ]
      : []),
    `<meta name="twitter:card" content="${picture.large ? 'summary_large_image' : 'summary'}" />`,
  ].join('\n    ')
  return html
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(/\s*<!-- The link-preview card[\s\S]*?-->/, '')
    .replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>/g, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}
