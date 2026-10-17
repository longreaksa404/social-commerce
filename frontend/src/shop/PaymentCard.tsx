import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CircleCheck, Copy, Download, Send, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, Card, IconButton } from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { formatMoney } from '../lib/money.ts'
import { drawKhqr, isIOS } from '../lib/khqrImage.ts'
import { formatOrderTime } from '../lib/orders.ts'
import { useT } from '../i18n/useT.ts'
import type { BankAccount, ShopOrder, ShopStore } from '../lib/types.ts'
import { useContactLink } from './contact.ts'
import { trackStep } from './orderWords.ts'

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
        // Once it's delivered, no more asking to pay (UX check #8).
        trackStep(order) === 'delivered' ? (
          <p className="mt-2 text-sm text-slate-600">{p.codDone(total)}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {p.codBefore} <span className="font-semibold text-slate-900">{total}</span>{' '}
            {order.delivery_method === 'pickup' ? p.codAfterPickup : p.codAfter}
          </p>
        )
      ) : payment.khqr || payment.bank_account ? (
        <HowToPay shop={shop} order={order} phone={phone} total={total} />
      ) : (
        // The seller turned this way to pay off after the order was placed.
        <p className="mt-2 text-sm text-slate-600">
          {p.askHow(shop.name, total)}
        </p>
      )}
    </Card>
  )
}

/** The KHQR or the bank account, then "I've paid". Once the customer has
 * said they paid, that leads, and the QR or account folds behind "Show
 * ... again" so nobody thinks they still have to pay (UX check #9,
 * 2026-10-17). */
function HowToPay({ shop, order, phone, total }: { shop: ShopStore; order: ShopOrder; phone: string; total: string }) {
  const p = useT().order.pay
  const { payment } = order
  const [toldAt, setToldAt] = useState(payment.claimed_at)
  const [again, setAgain] = useState(false)
  const how = payment.khqr ? (
    <KhqrPayment shop={shop} order={order} code={payment.khqr.code} name={payment.khqr.merchant_name} />
  ) : (
    payment.bank_account && <BankPayment account={payment.bank_account} total={total} orderNumber={order.number} />
  )
  if (!toldAt) {
    return (
      <>
        {how}
        <IvePaid shop={shop} order={order} phone={phone} toldAt={null} onTold={setToldAt} />
      </>
    )
  }
  return (
    <>
      <IvePaid shop={shop} order={order} phone={phone} toldAt={toldAt} onTold={setToldAt} />
      <button
        type="button"
        aria-expanded={again}
        onClick={() => setAgain((open) => !open)}
        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline"
      >
        {payment.khqr ? p.showQrAgain : p.showBankAgain}
        <ChevronDown aria-hidden className={`size-4 transition-transform ${again ? 'rotate-180' : ''}`} />
      </button>
      {again && how}
    </>
  )
}

/** "I've paid" (founder's pick 6B): tells the shop (the bell and
 * Telegram; the seller still checks their bank), and opens the shop's
 * chat with a line typed in, for the receipt screenshot. The payment stays
 * "not paid" until the seller confirms it. Once told: when, and sending
 * the receipt again. */
function IvePaid({
  shop,
  order,
  phone,
  toldAt,
  onTold,
}: {
  shop: ShopStore
  order: ShopOrder
  phone: string
  toldAt: string | null
  onTold: (at: string) => void
}) {
  const p = useT().order.pay
  const queryClient = useQueryClient()
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
        onTold(new Date().toISOString())
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
      <div className="mt-2 space-y-1">
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
