import { useSyncExternalStore } from 'react'
import { reducedMotion } from '../components/effects.ts'

// Added to the cart: the product's photo flies from the page into the cart
// button in the header, which bumps as it lands, so the customer sees
// where their things went. The cart's numbers (the header's count, the
// cart bar's items and total) change as it lands, not at the tap, and the
// flight is quick (cart page check 2B, founder 2026-11-04: "make it more
// faster"; 0.7 s before).

const LANDED = 'sc:cart-landed'
const DURATION = 450

/** What's added but still flying: the cart's numbers leave it out until
 * it lands (useFlying). */
export type Load = { count: number; cents: number }
let flying: Load = { count: 0, cents: 0 }
const watchers = new Set<() => void>()
function carry(load: Load, sign: 1 | -1) {
  flying = { count: flying.count + sign * load.count, cents: flying.cents + sign * load.cents }
  watchers.forEach((notify) => notify())
}

/** What's on its way to the cart now; nothing when it's all landed. */
export function useFlying(): Load {
  return useSyncExternalStore(
    (notify) => {
      watchers.add(notify)
      return () => watchers.delete(notify)
    },
    () => flying,
  )
}

/** Flies a round copy of `image` (or a green dot, without one) from the
 * middle of `from` to the cart button. `load`: what was just added, kept
 * out of the cart's numbers until it lands. */
export function flyToCart(from: Element, image: string | null, load?: Load) {
  const cart = document.querySelector('[data-cart-button]')
  if (!cart || reducedMotion()) return landed()
  const start = from.getBoundingClientRect()
  const end = cart.getBoundingClientRect()
  const size = Math.min(88, start.width, start.height)
  const x = start.left + start.width / 2
  const y = start.top + start.height / 2

  // Sideways on the outer box and up on the inner one, eased differently,
  // so the path curves like a toss rather than a straight line.
  const outer = document.createElement('div')
  outer.setAttribute('aria-hidden', 'true')
  outer.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;z-index:60;pointer-events:none`
  const inner = document.createElement('div')
  inner.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:9999px',
    'border:2px solid #fff',
    'box-shadow:0 10px 24px -8px rgb(0 0 0 / 0.45)',
    'background:var(--color-brand) center / cover no-repeat',
  ].join(';')
  if (image) inner.style.backgroundImage = `url("${image}")`
  outer.append(inner)
  document.body.append(outer)
  if (load) carry(load, 1)

  const dx = end.left + end.width / 2 - x
  const dy = end.top + end.height / 2 - y
  outer.animate([{ transform: 'none' }, { transform: `translateX(${dx}px)` }], {
    duration: DURATION,
    easing: 'cubic-bezier(0.35, 0, 0.65, 1)',
    fill: 'forwards',
  })
  const flight = inner.animate(
    [
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.8 },
      { transform: `translateY(${dy}px) scale(${Math.max(0.2, 22 / size)})`, opacity: 0.5 },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.3, 0.3, 0.55, 1)', fill: 'forwards' },
  )
  flight.onfinish = flight.oncancel = () => {
    outer.remove()
    if (load) carry(load, -1)
    landed()
  }
}

function landed() {
  window.dispatchEvent(new Event(LANDED))
}

/** Calls `listener` each time something lands in the cart; returns the
 * unsubscribe function (for useEffect). */
export function onCartLanded(listener: () => void) {
  window.addEventListener(LANDED, listener)
  return () => window.removeEventListener(LANDED, listener)
}
