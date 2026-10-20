import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { api } from '../lib/api.ts'
import { replaceCart, type CartLine } from './cart.ts'
import { saveTelegramCustomer, useTelegramCustomer, type ShopCustomer } from './telegramLogin.ts'

/** The shop inside Telegram as a mini app (founder, 2026-10-20: "so it
 * doesn't matter if they come from other social media or a browser").
 * The same pages as in a browser; inside Telegram the customer is logged
 * in by who Telegram says opened it, the bot's "Open checkout" brings the
 * cart along, and Telegram's own back arrow goes back. Telegram's script
 * loads only inside Telegram, so a browser never carries it. */

export type WebApp = {
  initData: string
  version: string
  platform: string
  colorScheme: string
  ready: () => void
  expand: () => void
  isVersionAtLeast: (version: string) => boolean
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
  downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void
  BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp }
  }
}

const FLAG = 'sc.miniapp'
const FROM_SHOPS = 'sc.fromshops'

/** Opening a shop from "Your shops" (pages/YourShops.tsx): its home gets
 * Telegram's back arrow to the list. */
export function markFromYourShops() {
  try {
    sessionStorage.setItem(FROM_SHOPS, '1')
  } catch {
    // No way back to the list but Telegram's own close.
  }
}

function fromYourShops(): boolean {
  try {
    return sessionStorage.getItem(FROM_SHOPS) === '1'
  } catch {
    return false
  }
}

/** Opened inside Telegram: Telegram puts its launch data in the address of
 * the first page; the tab remembers it for the pages after. */
export function insideTelegram(): boolean {
  try {
    if (window.location.hash.includes('tgWebAppData')) {
      sessionStorage.setItem(FLAG, '1')
      return true
    }
    return sessionStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

let loading: Promise<WebApp | null> | null = null

export function loadTelegram(): Promise<WebApp | null> {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp)
  loading ??= new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.onload = () => resolve(window.Telegram?.WebApp ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return loading
}

/** Telegram's app object once loaded (inside Telegram only), else null. */
export const telegramApp = (): WebApp | null => window.Telegram?.WebApp ?? null

type ServerLine = {
  product_id: string
  variant_id: string | null
  quantity: number
  product_slug: string
  name: string
  variant_name: string | null
  price: string
  image_url: string | null
}
type Session = ShopCustomer & { token: string }

const toCartLine = (l: ServerLine): CartLine => ({
  productId: l.product_id,
  variantId: l.variant_id,
  quantity: l.quantity,
  productSlug: l.product_slug,
  name: l.name,
  variantName: l.variant_name,
  price: l.price,
  imageUrl: l.image_url,
})

/** In the shop's layout: inside Telegram, get ready, log in (from the bot's
 * "Open checkout" with its cart, else a customer who shared their phone
 * before), and show Telegram's back arrow off the shop's home. */
export function useMiniApp(shop: string) {
  const [app, setApp] = useState<WebApp | null>(null)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const customer = useTelegramCustomer()
  const tried = useRef(false)
  const inside = insideTelegram()

  useEffect(() => {
    if (!inside) return
    void loadTelegram().then((webApp) => {
      if (!webApp?.initData) return
      webApp.ready()
      webApp.expand()
      setApp(webApp)
    })
  }, [inside])

  // Logging in, once per opening.
  const checkId = params.get('tg')
  useEffect(() => {
    if (!app || tried.current) return
    tried.current = true
    const path = `/shop/${encodeURIComponent(shop)}`
    const initData = { init_data: app.initData }
    if (checkId) {
      void api<{ customer: Session; lines: ServerLine[] }>(`${path}/telegram-login/${checkId}/mini-app`, {
        method: 'POST',
        body: initData,
        auth: false,
      })
        .then(({ customer: session, lines }) => {
          saveTelegramCustomer({ token: session.token, name: session.name, phone: session.phone })
          if (lines.length) replaceCart(shop, lines.map(toCartLine))
        })
        .catch(() => {
          // Expired or someone else's: checkout offers Continue with Telegram.
        })
        .finally(() => navigate({ search: '' }, { replace: true }))
    } else if (!customer) {
      void api<Session>(`${path}/mini-app-login`, { method: 'POST', body: initData, auth: false })
        .then((session) => saveTelegramCustomer({ token: session.token, name: session.name, phone: session.phone }))
        .catch(() => {
          // Never shared their phone: checkout offers Continue with Telegram.
        })
    }
  }, [app, checkId, customer, navigate, shop])

  // Telegram's back arrow instead of a browser's: back, or to the shop's
  // home when the mini app opened straight on a page (from "Open checkout");
  // on the home, back to "Your shops" if it came from there.
  useEffect(() => {
    if (!app) return
    const home = `/shop/${shop}`
    const atHome = pathname === home || pathname === `${home}/`
    if (atHome && !fromYourShops()) {
      app.BackButton.hide()
      return
    }
    const back = atHome
      ? () => navigate('/shops')
      : () => (window.history.length > 1 ? navigate(-1) : navigate(home, { replace: true }))
    app.BackButton.onClick(back)
    app.BackButton.show()
    return () => app.BackButton.offClick(back)
  }, [app, pathname, shop, navigate])
}
