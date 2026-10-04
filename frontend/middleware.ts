/**
 * Link previews for shared shop links (Vercel Routing Middleware, runs
 * before the SPA). Facebook, Messenger, Telegram, TikTok and the like build
 * a link's preview card from the page's HTML without running JavaScript,
 * so without this every link shows the generic "Social Commerce" card.
 *
 * Only for those preview bots: they get index.html with the shop's,
 * product's or category's title, description and photo filled in. People
 * go straight through to the app untouched, so a slow or sleeping API never
 * slows down a customer. If the API doesn't answer in time, the bot gets
 * the generic card.
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
type CategoryPage = { category: { name: string }; products: { image_url: string | null }[] }
type Preview = { title: string; description: string; image: string | null }

export default async function middleware(request: Request) {
  if (!PREVIEW_BOTS.test(request.headers.get('user-agent') ?? '')) return next()

  const url = new URL(request.url)
  const page = await fetch(new URL('/index.html', url))
  if (!page.ok) return next()
  const html = await page.text()

  let preview: Preview | null = null
  try {
    preview = await describe(url.pathname)
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

async function describe(pathname: string): Promise<Preview | null> {
  // /shop/{store}, /shop/{store}/product/{slug}, /shop/{store}/category/{slug}
  const [, , storeSlug, kind, slug] = pathname.split('/').map(decodeURIComponent)
  if (!storeSlug) return null
  const shop = `/shop/${encodeURIComponent(storeSlug)}`
  const store = await api<Store>(shop)

  if (kind === 'product' && slug) {
    const product = await api<Product>(`${shop}/products/${encodeURIComponent(slug)}`)
    const prices = product.variants.length ? product.variants.map((v) => Number(v.price)) : [Number(product.price)]
    const price = priceRange(Math.min(...prices), Math.max(...prices), store.currency)
    return {
      title: product.name,
      description: [price, store.name, product.description].filter(Boolean).join(' · '),
      image: product.image_urls[0] ?? store.logo_url,
    }
  }
  if (kind === 'category' && slug) {
    const page = await api<CategoryPage>(`${shop}/categories/${encodeURIComponent(slug)}`)
    const count = page.products.length
    return {
      title: `${page.category.name} · ${store.name}`,
      description: `ទំនិញ ${count}។ ${ORDER_ONLINE}`,
      image: page.products.find((p) => p.image_url)?.image_url ?? store.logo_url,
    }
  }
  if (kind && kind !== 'cart' && kind !== 'checkout') return null
  return { title: store.name, description: store.description || ORDER_ONLINE, image: store.logo_url }
}

async function api<T>(path: string): Promise<T> {
  const base = process.env.VITE_API_URL ?? 'http://localhost:8000'
  const response = await fetch(`${base}/api/v1${path}`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`API ${response.status}`)
  return (await response.json()) as T
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

/** index.html with the page's own title, description and photo. */
function withPreview(html: string, preview: Preview, pageUrl: string): string {
  const title = escapeHtml(shorten(preview.title, 90))
  const description = escapeHtml(shorten(preview.description, 200))
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    ...(preview.image
      ? [
          `<meta property="og:image" content="${escapeHtml(preview.image)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
        ]
      : [`<meta name="twitter:card" content="summary" />`]),
  ].join('\n    ')
  return html
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}
