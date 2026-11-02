import { CircleCheck, Download, X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { encode } from 'uqr'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import type { ShopOrder, ShopPayment, ShopStore } from '../lib/types.ts'
import { useKhqrPicture } from './khqrPicture.ts'
import { IvePaid } from './PaymentCard.tsx'

type Khqr = NonNullable<ShopPayment['khqr']>

/**
 * The pay popup (founder's picks 1A 2C 3B 4C 5A 6A, 2026-11-02): a sheet
 * from the bottom (a box from `sm` up) that is the KHQR card itself, the
 * red header on top, then who is paid, the amount and the code; under it
 * "Scan to pay, or Download QR" and "I've paid". The ✕, a swipe down, Esc
 * (Android's back) or a tap outside closes it, and so does "I've paid",
 * after which the order page shows it was told. When it opens:
 * `usePayPopup` in ShopOrder.tsx.
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
  const titleId = useId()

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      // Back in place if a swipe sent it down last time.
      el.style.transform = ''
      el.style.transition = ''
      el.showModal()
    } else if (!open && el.open) el.close()
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
      aria-labelledby={titleId}
      className="m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-3xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-sm sm:rounded-3xl sm:open:animate-zoom-in"
    >
      {open && <PayNow shop={shop} order={order} khqr={khqr} phone={phone} titleId={titleId} onClose={onClose} />}
    </dialog>
  )
}

function PayNow({
  shop,
  order,
  khqr,
  phone,
  titleId,
  onClose,
}: {
  shop: ShopStore
  order: ShopOrder
  khqr: Khqr
  phone: string
  titleId: string
  onClose: () => void
}) {
  const t = useT()
  const p = t.order.pay
  const total = formatMoney(order.payment.amount, order.currency)
  const { save } = useKhqrPicture(shop, order, khqr.code, khqr.merchant_name)
  const [saved, setSaved] = useState(false)
  return (
    <>
      {/* The card keeps its own colours in dark mode, like the saved
          picture (lib/khqrImage.ts): bank apps scan black on white. */}
      <div className="bg-white text-[#0f172a]">
        <div className="relative flex h-14 items-center bg-[#E1232E] pr-1.5 pl-5 text-white">
          {/* Swipe down to close (phones). */}
          <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/60 sm:hidden" />
          <h2 id={titleId} className="flex-1 text-xl font-extrabold tracking-wide">
            <span aria-hidden>KHQR</span>
            <span className="sr-only">{p.payTitle(total)}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="grid size-11 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden className="size-5" />
          </button>
          {/* The header's corner tab, under its right end. */}
          <span
            aria-hidden
            className="absolute top-full right-0 size-0 border-t-[14px] border-l-[28px] border-t-[#E1232E] border-l-transparent"
          />
        </div>
        <div className="px-5 pt-4 pb-3">
          <p className="truncate text-sm font-semibold tracking-wide text-[#334155]">{khqr.merchant_name}</p>
          <p className="text-3xl font-extrabold tabular-nums">{total}</p>
        </div>
        <div aria-hidden className="border-t-[1.5px] border-dashed border-[#cbd5e1]" />
        {/* About four modules of white around the code, as scanners want. */}
        <QrCode
          code={khqr.code}
          label={p.khqrAlt(total, khqr.merchant_name)}
          className="mx-auto mt-6 block w-[min(60vw,14rem,32dvh)] sm:w-60"
        />
        <p className="pt-5 pb-4 text-center text-xs text-[#64748b]">
          {`${t.shop.orderNumber(order.number)} · ${shop.name}`}
        </p>
      </div>
      <div className="px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center sm:pb-5">
        <p className="font-semibold text-slate-900">{p.scanToPay}</p>
        <p className="text-sm text-slate-500">{p.or}</p>
        {/* The toast would be under the popup: the link says it instead. */}
        <button
          type="button"
          onClick={() => save(() => setSaved(true))}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-navy-700 link"
        >
          {saved ? (
            <CircleCheck aria-hidden className="size-4.5 text-emerald-600" />
          ) : (
            <Download aria-hidden className="size-4.5" />
          )}
          <span aria-live="polite">{saved ? p.qrSaved : p.downloadQr}</span>
        </button>
        <p className="text-sm text-slate-500">{p.uploadToBank}</p>
        <IvePaid shop={shop} order={order} phone={phone} toldAt={null} onTold={onClose} />
      </div>
    </>
  )
}

/** The code as SVG, sharp at any size: black on the card's white, error
 * correction M like the saved picture, each row's dark runs as one shape. */
function QrCode({ code, label, className }: { code: string; label: string; className: string }) {
  const qr = useMemo(() => {
    const { size, data } = encode(code, { ecc: 'M', border: 0 })
    let path = ''
    data.forEach((row, y) => {
      let x = 0
      while (x < size) {
        if (!row[x]) {
          x++
          continue
        }
        const from = x
        while (x < size && row[x]) x++
        path += `M${from} ${y}h${x - from}v1H${from}z`
      }
    })
    return { size, path }
  }, [code])
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={qr.path} fill="#000" />
    </svg>
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
