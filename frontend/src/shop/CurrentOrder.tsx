import { ChevronRight, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { reducedMotion } from '../components/effects.ts'
import { useT } from '../i18n/useT.ts'
import type { ShopOrder } from '../lib/types.ts'
import { ProductImage } from './components.tsx'
import { awaitsPayment, orderHeadline } from './orderWords.ts'
import { inProgress, useMyOrders } from './queries.ts'

// How long the order shows under the header when the shop opens.
const SHOW_MS = 4000
// Shops whose orders have dropped in since the page loaded: once a visit,
// not again on every page.
const announced = new Set<string>()

/** In the shop's header while an order placed on this phone is on its
 * way: a box button that opens it (or Your orders, with several), rocking
 * now and then like a parcel with something in it. When the shop opens,
 * the order first drops in under the header for a few seconds, then
 * shrinks into the box, so a customer coming back through any of the
 * seller's links sees it and where it went. Gone once it's delivered or
 * closed. */
export function CurrentOrderButton({ slug }: { slug: string }) {
  const t = useT()
  const active = useMyOrders(slug, { recent: true })
    .map((o) => o.order)
    .filter((o): o is ShopOrder => o !== undefined && inProgress(o))
  const [tucked, setTucked] = useState(() => announced.has(slug))
  const dropped = !tucked && active.length > 0
  const [held, setHeld] = useState(false)
  // Bumps each time the order lands in the box.
  const [landings, setLandings] = useState(0)
  const box = useRef<HTMLAnchorElement>(null)
  const card = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (dropped) announced.add(slug)
  }, [dropped, slug])

  // A few seconds, and longer while a finger, pointer or keyboard is on it.
  useEffect(() => {
    if (!dropped || held) return
    const timer = setTimeout(() => {
      tuck(card.current, box.current, () => {
        setTucked(true)
        setLandings((n) => n + 1)
      })
    }, SHOW_MS)
    return () => clearTimeout(timer)
  }, [dropped, held])

  if (active.length === 0) return null

  const one = active.length === 1 ? active[0] : null
  const to = one ? `/shop/${slug}/order/${one.id}` : `/shop/${slug}/orders`
  const unpaid = active.filter(awaitsPayment).length
  const first = one?.items[0]
  const title = one
    ? first
      ? t.order.firstItem(first.product_name, one.items.length - 1)
      : t.shop.orderNumber(one.number)
    : t.shop.myOrders.inProgressCount(active.length)
  const amber = 'font-semibold text-amber-700'
  const sub = one ? (
    <>
      {orderHeadline(t, one)}
      {awaitsPayment(one) && (
        <>
          {' · '}
          <span className={amber}>{t.order.notPaidYet}</span>
        </>
      )}
    </>
  ) : unpaid ? (
    <span className={amber}>{t.shop.myOrders.notPaidCount(unpaid)}</span>
  ) : (
    t.shop.myOrders.seeThem
  )
  const label = (
    one
      ? [title, orderHeadline(t, one), awaitsPayment(one) && t.order.notPaidYet]
      : [title, unpaid > 0 && t.shop.myOrders.notPaidCount(unpaid)]
  )
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <Link
        ref={box}
        to={to}
        aria-label={label}
        title={label}
        className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
      >
        <span className={`flex ${dropped ? '' : 'origin-bottom animate-nudge'}`}>
          <Package key={landings} aria-hidden className={`size-6 ${landings ? 'animate-pop' : ''}`} />
        </span>
        <span aria-hidden className="absolute top-2 right-1.5 size-2.5 rounded-full bg-navy-600 ring-2 ring-surface" />
      </Link>
      {dropped && (
        // Under the header, at the right on wide screens (below the box).
        <div className="pointer-events-none absolute inset-x-0 top-full">
          <div className="mx-auto flex max-w-6xl justify-end px-4 pt-2">
            <Link
              ref={card}
              to={to}
              onPointerEnter={() => setHeld(true)}
              onPointerLeave={() => setHeld(false)}
              onFocus={() => setHeld(true)}
              onBlur={() => setHeld(false)}
              className="pointer-events-auto flex w-full animate-drop-in items-center gap-3 rounded-2xl bg-surface p-3 shadow-lg ring-1 ring-slate-900/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 sm:w-96"
            >
              <Photos orders={active} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{title}</span>
                <span className="block truncate text-sm text-slate-600">{sub}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

/** What was bought: the first item's photo, or one per order side by side. */
function Photos({ orders }: { orders: ShopOrder[] }) {
  if (orders.length === 1) {
    return <ProductImage small src={orders[0].items[0]?.image_url} alt="" className="size-12 shrink-0 rounded-xl" />
  }
  return (
    <span className="flex shrink-0">
      {orders.map((order, i) => (
        <ProductImage
          key={order.id}
          small
          src={order.items[0]?.image_url}
          alt=""
          className={`size-10 rounded-xl ring-2 ring-surface ${i ? '-ml-4' : ''}`}
        />
      ))}
    </span>
  )
}

/** Shrinks the card into the box button, as a photo flies into the cart
 * (fly.ts), then calls `done`. */
function tuck(card: HTMLElement | null, box: HTMLElement | null, done: () => void) {
  if (!card || !box || reducedMotion()) return done()
  const from = card.getBoundingClientRect()
  const to = box.getBoundingClientRect()
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  card.style.pointerEvents = 'none'
  const shrink = card.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${24 / from.width})`, opacity: 0.3 },
    ],
    { duration: 450, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
  )
  shrink.onfinish = shrink.oncancel = done
}
