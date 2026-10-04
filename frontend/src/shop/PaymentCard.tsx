import { CircleCheck, Copy, Download, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import { encode } from 'uqr'
import { useFeedback } from '../components/feedback.ts'
import { Button, Card, IconButton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import { useT } from '../i18n/useT.ts'
import type { BankAccount, ShopOrder, ShopStore } from '../lib/types.ts'

/** How to pay for the order, and whether the seller has received it. */
export function PaymentCard({ shop, order }: { shop: ShopStore; order: ShopOrder }) {
  const { payment } = order
  const total = formatMoney(payment.amount, order.currency)
  const t = useT()
  const p = t.order.pay
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{p.title}</h2>
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
        <KhqrPayment shop={shop} order={order} code={payment.khqr.code} name={payment.khqr.merchant_name} />
      ) : payment.bank_account ? (
        <BankPayment account={payment.bank_account} total={total} orderNumber={order.number} />
      ) : (
        // The seller turned this way to pay off after the order was placed.
        <p className="mt-2 text-sm text-slate-600">
          {p.askHow(shop.name, total)}
        </p>
      )}
    </Card>
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

  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600">
        {p.khqrBefore} <span className="font-semibold text-slate-900">{total}</span> {p.khqrAfter}
      </p>
      <img
        src={image.url}
        alt={p.khqrAlt(total, name)}
        className="mx-auto mt-3 w-full max-w-72 rounded-xl border border-slate-200"
      />
      <Button variant="secondary" icon={Download} onClick={save} className="mt-3 w-full">
        {p.saveQr}
      </Button>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>{p.khqrStep1}</li>
        <li>{p.khqrStep2}</li>
        <li>{p.khqrStep3}</li>
      </ol>
      <p className="mt-3 text-sm text-slate-500">
        {p.khqrNote(shop.name)}
      </p>
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
