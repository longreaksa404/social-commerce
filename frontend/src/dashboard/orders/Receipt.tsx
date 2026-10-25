import { Download, Printer, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import { drawReceipt, type ReceiptLine } from '../../lib/receiptImage.ts'
import type { Order, Store } from '../../lib/types.ts'
import { useOrder, useStore } from '../queries.ts'

/** What the slip says (founder's pick 4A, 2026-10-25): the shop, the
 * order, who and where, the items and totals, and in a box what the
 * driver collects (or that it's paid). In the app's language. */
function receiptLines(t: Messages, order: Order, store: Store | undefined): ReceiptLine[] {
  const r = t.orders.receipt
  const money = (amount: string) => formatMoney(amount, order.currency)
  const time = new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const lines: ReceiptLine[] = [{ kind: 'title', text: store?.name ?? '' }]
  if (store?.contact_phone) lines.push({ kind: 'center', text: formatPhone(store.contact_phone) })
  lines.push({ kind: 'rule' }, { kind: 'pair', left: `#${order.number}`, right: `${formatDate(order.created_at)} ${time}` })
  lines.push({ kind: 'strong', text: `${order.customer.name} · ${formatPhone(order.customer.phone)}` })
  if (order.delivery_method === 'pickup') lines.push({ kind: 'text', text: t.checkout.pickup })
  else if (order.delivery_address) lines.push({ kind: 'text', text: order.delivery_address })
  if (order.delivery_address_note) lines.push({ kind: 'small', text: order.delivery_address_note })
  lines.push({ kind: 'rule' })
  for (const item of order.items) {
    const name = `${item.quantity} × ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`
    lines.push({ kind: 'pair', left: name, right: money(item.line_total) })
  }
  if (Number(order.discount) > 0) lines.push({ kind: 'pair', left: t.shop.summary.discount, right: `−${money(order.discount)}` })
  if (order.delivery_method !== 'pickup') {
    const fee = Number(order.delivery_fee) > 0 ? money(order.delivery_fee) : t.shop.summary.free
    lines.push({ kind: 'pair', left: t.shop.summary.delivery, right: fee })
  }
  lines.push({ kind: 'pair', left: t.shop.summary.total, right: money(order.total), strong: true })
  const { payment } = order
  lines.push({
    kind: 'box',
    text:
      payment.status === 'paid'
        ? r.paid
        : payment.method === 'cod'
          ? r.collect(money(payment.amount))
          : r.toPay(money(payment.amount), t.status.paymentMethod[payment.method]),
  })
  if (order.notes) lines.push({ kind: 'small', text: `${r.note}${order.notes}` })
  lines.push({ kind: 'center', text: r.thanks })
  return lines
}

/** /dashboard/orders/:orderId/receipt: the slip, from the order's ⋯ menu.
 * Share (or Save) picture first: most receipt printers here are Bluetooth
 * ones that print a picture from their own app, and it's what goes to
 * the customer in a chat; Print for a printer the phone or laptop
 * reaches. */
export function Receipt() {
  const { orderId = '' } = useParams()
  const order = useOrder(orderId)
  const store = useStore()
  const t = useT()
  const r = t.orders.receipt
  const { toast } = useFeedback()
  const [image, setImage] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const back = `/dashboard/orders/${orderId}`

  const data = order.data
  useEffect(() => {
    if (!data) return
    let live = true
    drawReceipt(receiptLines(t, data, store.data)).then((drawn) => live && setImage(drawn))
    return () => {
      live = false
    }
  }, [data, store.data, t])

  if (order.error) {
    return (
      <>
        <PageHeader title={r.title} back={back} />
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </>
    )
  }

  const fileName = `order-${data?.number ?? ''}-receipt.png`
  async function file(): Promise<File | null> {
    const blob = await new Promise<Blob | null>((resolve) => image?.canvas.toBlob(resolve, 'image/png'))
    return blob && new File([blob], fileName, { type: 'image/png' })
  }
  const canShare = typeof navigator.canShare === 'function' && window.matchMedia('(pointer: coarse)').matches

  async function share() {
    const picture = await file()
    if (picture && navigator.canShare?.({ files: [picture] })) {
      try {
        await navigator.share({ files: [picture] })
      } catch {
        // Closed the share list: nothing to do.
      }
      return
    }
    save()
  }

  function save() {
    if (!image) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
    toast(r.saved)
  }

  return (
    <>
      <PageHeader title={r.title} back={back} />
      <title>{r.title}</title>
      <div className="space-y-4 pb-4">
        {image ? (
          <img
            id="receipt-print"
            src={image.url}
            alt={r.alt(data?.number ?? 0)}
            className="mx-auto w-full max-w-80 rounded-md shadow-card ring-1 ring-slate-200"
          />
        ) : (
          <Skeleton className="mx-auto h-[28rem] w-full max-w-80 rounded-md" />
        )}
        <div className="mx-auto grid max-w-80 gap-2">
          {canShare ? (
            <Button icon={Share2} size="lg" disabled={!image} onClick={share}>
              {r.share}
            </Button>
          ) : (
            <Button icon={Download} size="lg" disabled={!image} onClick={save}>
              {r.save}
            </Button>
          )}
          <Button variant="secondary" icon={Printer} disabled={!image} onClick={() => window.print()}>
            {r.print}
          </Button>
          <p className="text-center text-xs leading-5 text-slate-500">{r.bluetoothHint}</p>
        </div>
      </div>
    </>
  )
}
