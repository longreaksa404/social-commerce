import { CircleCheck, Download, X } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { KhqrCard } from '../components/KhqrCard.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import type { ShopOrder, ShopPayment, ShopStore } from '../lib/types.ts'
import { useKhqrPicture } from './khqrPicture.ts'
import { IvePaid } from './PaymentCard.tsx'

type Khqr = NonNullable<ShopPayment['khqr']>

/**
 * The pay popup (founder's picks 1A 2C 3B 4C 5A 6A, 2026-11-02): a sheet
 * from the bottom (a box from `sm` up) that is the KHQR card itself, the
 * red band on top, then who is paid, the amount and the code; under it
 * "Scan to pay, or Download QR" and "I've paid". The ✕, a swipe down, Esc
 * (Android's back) or a tap outside closes it, and so does "I've paid",
 * after which the order page shows it was told. It goes the way it came:
 * the sheet slides down (the box fades), unless a swipe already took it
 * down (2026-11-03). When it opens: `usePayPopup` in ShopOrder.tsx.
 */
export function PayNowSheet({
  shop,
  order,
  khqr,
  phone,
  open,
  onClose,
}: {
  shop: ShopStore
  order: ShopOrder
  khqr: Khqr
  phone: string
  open: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  // Its content stays while it slides away.
  const [shown, setShown] = useState(open)
  if (open && !shown) setShown(true)
  const p = useT().order.pay

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open) {
      delete el.dataset.closing
      if (!el.open) {
        // Back in place if a swipe sent it down last time.
        el.style.transform = ''
        el.style.transition = ''
        el.showModal()
      }
      return
    }
    if (!el.open) return
    const done = () => {
      el.close()
      delete el.dataset.closing
      setShown(false)
    }
    // Swiped away: it's already down.
    if (el.style.transform) return done()
    el.dataset.closing = ''
    const ended = (e: AnimationEvent) => {
      if (e.target === el && !e.pseudoElement) done()
    }
    el.addEventListener('animationend', ended)
    // In case the animation never runs (a hidden tab).
    const timer = setTimeout(done, 500)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('animationend', ended)
    }
  }, [open])
  useSwipeDown(dialog, onClose)

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-label={p.payTitle(formatMoney(order.payment.amount, order.currency))}
      className="theme-light m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-3xl bg-surface p-0 shadow-xl open:animate-sheet-up data-closing:animate-sheet-down data-closing:backdrop:animate-fade-out sm:m-auto sm:max-w-sm sm:rounded-3xl sm:open:animate-zoom-in sm:data-closing:animate-zoom-out"
    >
      {shown && <PayNow shop={shop} order={order} khqr={khqr} phone={phone} onClose={onClose} />}
    </dialog>
  )
}

function PayNow({
  shop,
  order,
  khqr,
  phone,
  onClose,
}: {
  shop: ShopStore
  order: ShopOrder
  khqr: Khqr
  phone: string
  onClose: () => void
}) {
  const t = useT()
  const p = t.order.pay
  const total = formatMoney(order.payment.amount, order.currency)
  const { save } = useKhqrPicture(shop, order, khqr.code, khqr.merchant_name)
  const [saved, setSaved] = useState(false)
  return (
    <>
      {/* The words start where the code starts (founder, 2026-11-03). */}
      <KhqrCard
        code={khqr.code}
        name={khqr.merchant_name}
        amount={order.payment.amount}
        currency={order.currency}
        label={p.khqrAlt(total, khqr.merchant_name)}
        column="w-[min(60vw,14rem,32dvh)] sm:w-60"
        bandClassName="h-14 pt-1.5"
        band={
          <>
            {/* Swipe down to close (phones). */}
            <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/80 sm:hidden" />
            {/* Phones close it with a swipe or a tap outside, as in the
                picture; the box on a laptop has no grab bar, so a ✕. */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="absolute top-1.5 right-1.5 hidden size-11 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white sm:grid"
            >
              <X aria-hidden className="size-5" />
            </button>
          </>
        }
      />
      <div className="px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center sm:pb-5">
        <p className="text-sm font-bold text-slate-900">{p.scanToPay}</p>
        <p className="text-xs text-slate-500">{p.or}</p>
        {/* The toast would be under the popup: the link says it instead. */}
        <button
          type="button"
          onClick={() => save(() => setSaved(true))}
          className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-sky-600 hover:text-sky-700"
        >
          {saved ? (
            <CircleCheck aria-hidden className="size-4.5 text-emerald-600" />
          ) : (
            <Download aria-hidden className="size-4.5" />
          )}
          <span aria-live="polite">{saved ? p.qrSaved : p.downloadQr}</span>
        </button>
        <p className="mx-auto max-w-56 text-xs text-slate-500">{p.uploadToBank}</p>
        <IvePaid shop={shop} order={order} phone={phone} toldAt={null} onTold={onClose} />
      </div>
    </>
  )
}

/** Swiping the sheet down closes it (pick 3B), on phones: it follows the
 * finger while scrolled to its top, and goes when pulled down a quarter of
 * its height or flicked; otherwise it springs back. */
function useSwipeDown(sheet: RefObject<HTMLDialogElement | null>, onClose: () => void) {
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const el = sheet.current
    if (!el) return
    const phone = window.matchMedia('(max-width: 639.98px)')
    let startY: number | null = null
    let startAt = 0
    let dy = 0
    let dragging = false
    const moveTo = (y: number) => {
      el.style.transition = dragging ? 'none' : 'transform 0.2s ease-out'
      el.style.transform = y > 0 ? `translateY(${y}px)` : ''
    }
    const start = (e: TouchEvent) => {
      startY = e.touches.length === 1 && phone.matches && el.scrollTop <= 0 ? e.touches[0].clientY : null
      startAt = e.timeStamp
      dy = 0
      dragging = false
    }
    const move = (e: TouchEvent) => {
      if (startY === null) return
      dy = e.touches[0].clientY - startY
      if (!dragging) {
        if (dy < 0) startY = null // scrolling the sheet instead
        if (dy < 8) return
        dragging = true
      }
      e.preventDefault()
      moveTo(dy)
    }
    const end = (e: TouchEvent) => {
      startY = null
      if (!dragging) return
      dragging = false
      const flick = dy > 40 && dy / Math.max(1, e.timeStamp - startAt) > 0.5
      if (dy > el.offsetHeight / 4 || flick) {
        moveTo(el.offsetHeight)
        setTimeout(close, 200)
      } else moveTo(0)
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [sheet])
}
