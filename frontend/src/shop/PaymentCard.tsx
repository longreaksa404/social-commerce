import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CircleCheck, Copy, Download, Send, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { encode } from 'uqr'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, Card, IconButton } from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { formatMoney } from '../lib/money.ts'
import { formatOrderTime } from '../lib/orders.ts'
import { useT } from '../i18n/useT.ts'
import type { BankAccount, ShopOrder, ShopStore } from '../lib/types.ts'
import { useContactLink } from './contact.ts'

/** How to pay for the order, and whether the seller has received it.
 * `phone`: the one it was placed with, for "I've paid". */
export function PaymentCard({ shop, order, phone }: { shop: ShopStore; order: ShopOrder; phone: string }) {
  const { payment } = order
  const total = formatMoney(payment.amount, order.currency)
  const t = useT()
  const p = t.order.pay
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">
          {payment.status === 'pending' && payment.method !== 'cod' ? p.payTitle(total) : p.title}
        </h2>
        <span className="text-sm text-slate-500">{t.status.paymentMethod[payment.method]}</span>
      </div>

      {payment.status === 'paid' ? (
        <p className="mt-2 flex items-center gap-1.5 font-medium text-emerald-700">
          <CircleCheck aria-hidden className="size-4.5" />
          {p.paid(total)}
        </p>
      ) : payment.status === 'failed' ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-red-700">
          <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {p.failed(shop.name)}
        </p>
      ) : payment.status === 'refunded' ? (
        <p className="mt-2 text-sm text-slate-600">{p.refunded}</p>
      ) : payment.method === 'cod' ? (
        <p className="mt-2 text-sm text-slate-600">
          {p.codBefore} <span className="font-semibold text-slate-900">{total}</span> {p.codAfter}
        </p>
      ) : payment.khqr ? (
        <>
          <KhqrPayment shop={shop} order={order} code={payment.khqr.code} name={payment.khqr.merchant_name} />
          <IvePaid shop={shop} order={order} phone={phone} />
        </>
      ) : payment.bank_account ? (
        <>
          <BankPayment account={payment.bank_account} total={total} orderNumber={order.number} />
          <IvePaid shop={shop} order={order} phone={phone} />
        </>
      ) : (
        // The seller turned this way to pay off after the order was placed.
        <p className="mt-2 text-sm text-slate-600">
          {p.askHow(shop.name, total)}
        </p>
      )}
    </Card>
  )
}

/** "I've paid" (founder's pick 6B): tells the shop (the bell and
 * Telegram; the seller still checks their bank), and opens the shop's
 * chat with a line typed in, for the receipt screenshot. The payment stays
 * "not paid" until the seller confirms it. */
function IvePaid({ shop, order, phone }: { shop: ShopStore; order: ShopOrder; phone: string }) {
  const p = useT().order.pay
  const queryClient = useQueryClient()
  const [toldAt, setToldAt] = useState(order.payment.claimed_at)
  const total = formatMoney(order.payment.amount, order.currency)
  const contact = useContactLink(shop, p.iPaidText(order.number, total))
  const channel = shop.telegram_username ? 'telegram' : shop.messenger_username ? 'messenger' : null

  function tell() {
    // Not awaited: the chat opens at once (a new tab after a wait is
    // blocked on iPhones), and keepalive finishes the call meanwhile.
    api(`/shop/${encodeURIComponent(shop.slug)}/orders/${order.id}/paid`, {
      method: 'POST',
      body: { phone },
      auth: false,
      keepalive: true,
    }).then(
      () => {
        setToldAt(new Date().toISOString())
        queryClient.invalidateQueries({ queryKey: ['shop', shop.slug, 'order', order.id] })
      },
      () => {},
    )
  }

  const link = channel && contact(channel)
  const open = (label: string, className: string) =>
    link && (
      <a
        href={link.href}
        target={link.target}
        rel="noreferrer"
        onClick={() => {
          link.onClick?.()
          tell()
        }}
        className={className}
      >
        <Send aria-hidden className="size-4" />
        {label}
      </a>
    )

  if (toldAt) {
    return (
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        <p className="flex items-start gap-1.5 text-sm text-slate-700">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          {p.told(shop.name, formatOrderTime(toldAt))}
        </p>
        {open(p.sendAgain, 'inline-flex min-h-11 items-center gap-2 text-sm font-medium text-navy-700 hover:underline')}
      </div>
    )
  }
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {link ? (
        open(p.iPaid, `${buttonClass('secondary')} w-full`)
      ) : (
        <Button variant="secondary" icon={CircleCheck} onClick={tell} className="w-full">
          {p.iPaidNoChat}
        </Button>
      )}
    </div>
  )
}

function KhqrPayment({ shop, order, code, name }: { shop: ShopStore; order: ShopOrder; code: string; name: string }) {
  const { toast } = useFeedback()
  const t = useT()
  const p = t.order.pay
  const total = formatMoney(order.payment.amount, order.currency)
  const caption = `${t.shop.orderNumber(order.number)} · ${shop.name}`
  const image = useMemo(() => drawKhqr({ code, name, amount: total, caption }), [code, name, total, caption])
  const fileName = `order-${order.number}-khqr.png`

  async function save() {
    const blob = await new Promise<Blob | null>((resolve) => image.canvas.toBlob(resolve, 'image/png'))
    const file = blob && new File([blob], fileName, { type: 'image/png' })
    // iPhones save to Photos (where bank apps look) only from the share
    // sheet; a download would land in Files.
    if (file && isIOS() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
      } catch {
        // Closed the share sheet: nothing to do.
      }
      return
    }
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
    toast(p.qrSaved)
  }

  // On a phone the customer can't scan their own screen: saving the QR
  // (then picking it in the bank app) is the first step, so it's the main
  // button and the steps fold away. On a laptop they scan the screen with
  // their phone: a big code, and saving is the smaller button.
  return (
    <div className="mt-3">
      <img
        src={image.url}
        alt={p.khqrAlt(total, name)}
        className="mx-auto w-full max-w-64 rounded-xl border border-slate-200 shadow-sm lg:max-w-80"
      />
      <div className="mt-4 lg:hidden">
        <Button icon={Download} onClick={save} size="lg" className="w-full">
          {p.saveQrPhotos}
        </Button>
        <details className="group mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1 rounded-lg text-sm font-medium text-navy-700 [&::-webkit-details-marker]:hidden">
            {p.howToPay}
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>{p.khqrStep1}</li>
            <li>{p.khqrStep2}</li>
            <li>{p.khqrStep3}</li>
          </ol>
          <p className="mt-3 text-sm text-slate-500">{p.khqrNote(shop.name)}</p>
        </details>
      </div>
      <div className="mt-4 hidden lg:block">
        <p className="text-center text-sm text-slate-600">{p.scanThis}</p>
        <Button variant="secondary" icon={Download} onClick={save} className="mt-3 w-full">
          {p.saveQr}
        </Button>
      </div>
    </div>
  )
}

function BankPayment({ account, total, orderNumber }: { account: BankAccount; total: string; orderNumber: number }) {
  const { toast } = useFeedback()
  const t = useT()
  const p = t.order.pay
  async function copy(text: string, copied: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(copied)
    } catch {
      toast(p.copyFailed, 'error')
    }
  }
  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600">
        {p.bankBefore} <span className="font-semibold text-slate-900">{total}</span> {p.bankAfter}
      </p>
      <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
        <Row label={p.bank} value={account.bank_name} />
        <Row label={p.name} value={account.account_name} />
        <Row
          label={p.account}
          value={account.account_number}
          copyLabel={p.copyAccount}
          onCopy={() => copy(account.account_number, p.accountCopied)}
          mono
        />
        <Row
          label={p.amount}
          value={total}
          copyLabel={p.copyAmount}
          onCopy={() => copy(total.replace(/[^\d.]/g, ''), p.amountCopied)}
        />
      </dl>
      <p className="mt-3 text-sm text-slate-500">
        {p.bankNote(orderNumber)}
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  copyLabel,
  onCopy,
  mono,
}: {
  label: string
  value: string
  copyLabel?: string
  onCopy?: () => void
  mono?: boolean
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 py-1 pr-1 pl-3.5">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-1">
        <span className={`min-w-0 flex-1 font-medium break-words text-slate-900 ${mono ? 'tabular-nums' : ''}`}>
          {value}
        </span>
        {onCopy && copyLabel && <IconButton label={copyLabel} icon={Copy} onClick={onCopy} />}
      </dd>
    </div>
  )
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

// The color of the KHQR mark, for the card's header.
const KHQR_RED = '#E1232E'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Khmer", sans-serif'

/** The code as one picture: KHQR header, who is paid, the amount, the QR,
 * and which order it's for, so a saved copy explains itself in the photo
 * gallery. */
function drawKhqr({ code, name, amount, caption }: { code: string; name: string; amount: string; caption: string }) {
  const qr = encode(code, { ecc: 'M', border: 0 })
  const width = 600
  const pad = 48
  const cell = Math.floor((width - pad * 2) / qr.size)
  const qrSize = cell * qr.size
  const header = 96
  const qrTop = header + 200 // 50px of white above the code (its quiet zone)
  const height = qrTop + qrSize + 96

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = KHQR_RED
  ctx.fillRect(0, 0, width, header)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 44px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('KHQR', pad, header / 2)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#334155'
  ctx.font = `600 28px ${FONT}`
  ctx.fillText(name, pad, header + 56)
  ctx.fillStyle = '#0f172a'
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(amount, pad, header + 122)

  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(pad, header + 150)
  ctx.lineTo(width - pad, header + 150)
  ctx.stroke()

  const left = Math.round((width - qrSize) / 2)
  ctx.fillStyle = '#000000'
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(left + x * cell, qrTop + y * cell, cell, cell)
    }),
  )

  ctx.fillStyle = '#64748b'
  ctx.font = `500 24px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(fit(ctx, caption, width - pad * 2), width / 2, qrTop + qrSize + 60)

  return { canvas, url: canvas.toDataURL('image/png') }
}

/** `text`, shortened with an ellipsis to fit `max` pixels. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let end = text.length
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > max) end--
  return `${text.slice(0, end)}…`
}
