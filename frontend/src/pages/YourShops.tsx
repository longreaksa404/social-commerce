import { ChevronRight, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { OakOrderName } from '../components/OakMark.tsx'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { formatDate } from '../lib/orders.ts'
import { ShopLogo } from '../shop/components.tsx'
import { insideTelegram, loadTelegram, markFromYourShops } from '../shop/miniApp.ts'
import { customerHeaders } from '../shop/telegramLogin.ts'

type MyShop = { name: string; slug: string; logo_url: string | null; last_order_at: string | null }

/** /shops, "Your shops" (founder, 2026-10-20): what OPEN in Telegram's chat
 * list opens, Oak's bot's main mini app. One address for every customer,
 * so it lists the Oak shops they've ordered from (inside Telegram by who
 * Telegram says opened it, in a browser by their Telegram login); with
 * just one, it goes straight into that shop. */
export function YourShops() {
  const t = useT()
  const y = t.shop.yourShops
  const [state, setState] = useState<{ shops: MyShop[] } | { error: unknown } | { loggedOut: true } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    void (async () => {
      const app = insideTelegram() ? await loadTelegram() : null
      app?.ready()
      app?.expand()
      const headers = customerHeaders()
      if (!app?.initData && !headers) {
        if (live) setState({ loggedOut: true })
        return
      }
      try {
        const shops = await api<MyShop[]>('/telegram/my-shops', {
          method: 'POST',
          body: { init_data: app?.initData || null },
          auth: false,
          headers,
        })
        if (live) setState({ shops })
      } catch (error) {
        if (live) setState({ error })
      }
    })()
    return () => {
      live = false
    }
  }, [attempt])

  if (state && 'shops' in state && state.shops.length === 1) {
    return <Navigate to={`/shop/${state.shops[0].slug}`} replace />
  }
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-6">
      <title>{y.title}</title>
      <OakOrderName className="text-base text-slate-500" />
      <h1 className="mt-2 mb-4 text-2xl font-bold text-slate-900">{y.title}</h1>
      {state === null ? (
        <div className="space-y-3" aria-hidden>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : 'error' in state ? (
        <ErrorState error={state.error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : 'loggedOut' in state || state.shops.length === 0 ? (
        <EmptyState icon={Store} title={'loggedOut' in state ? y.logIn : y.empty} />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {state.shops.map((shop) => (
            <Link
              key={shop.slug}
              to={`/shop/${shop.slug}`}
              onClick={markFromYourShops}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
            >
              <ShopLogo shop={shop} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{shop.name}</span>
                {shop.last_order_at && (
                  <span className="block text-sm text-slate-500">{y.lastOrder(formatDate(shop.last_order_at))}</span>
                )}
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
            </Link>
          ))}
        </Card>
      )}
    </main>
  )
}
