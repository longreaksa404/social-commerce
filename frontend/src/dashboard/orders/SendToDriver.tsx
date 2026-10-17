import { Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Field, IconButton, Input } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { Order, Store } from '../../lib/types.ts'
import { useStore } from '../queries.ts'

/** The order as the driver (or the courier's form) needs it, in the
 * seller's language: whose delivery, who and where, what, the cash to
 * collect and how it adds up, and the shop's number for when something's
 * wrong. Blank lines split it into blocks a driver can scan on a phone. */
function driverMessage(t: Messages, order: Order, store: Store | undefined): string {
  const d = t.orders.driver
  const { payment, currency } = order
  const money = (amount: string) => formatMoney(amount, currency)

  const who = [d.customer + order.customer.name, d.phone + formatPhone(order.customer.phone)]
  const pinned = order.delivery_lat !== null && order.delivery_lng !== null
  if (order.delivery_address) who.push(d.address + order.delivery_address)
  if (pinned) who.push(`${d.map}https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`)
  if (!order.delivery_address && !pinned) who.push(d.noAddress)
  if (order.delivery_address_note) who.push(d.note + order.delivery_address_note)

  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const what = [
    d.items(count),
    ...order.items.map(
      (item) => `• ${item.quantity} × ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`,
    ),
  ]

  let cash: string[]
  if (payment.status === 'paid') cash = [d.paid]
  else if (payment.method !== 'cod') cash = [d.payingBy(t.status.paymentMethod[payment.method])]
  else {
    cash = [d.collect(money(payment.amount))]
    const discount = Number(order.discount) > 0 ? money(order.discount) : null
    if (discount || Number(order.delivery_fee) > 0) {
      cash.push(d.breakdown(money(order.subtotal), discount, money(order.delivery_fee)))
    }
  }

  const blocks = [[d.title(order.number, store?.name ?? null)], who, what, cash]
  if (store?.contact_phone) blocks.push([d.shopPhone(formatPhone(store.contact_phone))])
  return blocks.map((block) => block.join('\n')).join('\n\n')
}

/** The phone's share list (Telegram, Messenger, ...) with the message
 * ready; on a laptop it's copied. Resolves to whether it went out: closing
 * the share list counts as not sent. */
function useShareWithDriver() {
  const o = useT().orders
  const { toast } = useFeedback()
  return async (text: string): Promise<'shared' | 'copied' | null> => {
    const phone = window.matchMedia('(pointer: coarse)').matches
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return null
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast(o.driverCopied)
      return 'copied'
    } catch {
      toast(o.driverCopyFailed, 'error')
      return null
    }
  }
}

/** Send to driver (founder's pick 4A, 2026-10-15): one step that asks for
 * the driver's name and phone (optional, only the seller sees it), sends
 * the message and records the delivery as assigned once it went out, so
 * nobody has to remember a separate Assign. "Save without sending" for a
 * driver who was phoned instead. A bottom sheet on phones, a centred card
 * from `sm` up, like the confirm dialog. */
export function SendToDriverSheet({
  order,
  open,
  onClose,
  onAssign,
}: {
  order: Order
  open: boolean
  onClose: () => void
  onAssign: (note: string | null, quiet: boolean) => Promise<boolean>
}) {
  const t = useT()
  const o = t.orders
  const store = useStore()
  const share = useShareWithDriver()
  const dialog = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState<'send' | 'save' | null>(null)
  const { courier } = order.delivery
  const failed = order.delivery.status === 'failed'
  const title = failed ? t.status.deliveryAction.tryAgain : courier ? t.status.deliveryAction.sendWith(courier) : o.sendToDriver

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      // A second try starts from who had it the first time.
      setNote(order.delivery.assignee_note ?? '')
      el.showModal()
    } else if (!open && el.open) el.close()
  }, [open, order.delivery.assignee_note])

  async function finish(how: 'send' | 'save') {
    setSaving(how)
    // The share list has to open straight from the tap.
    const sent = how === 'send' ? await share(driverMessage(t, order, store.data)) : 'saved'
    if (sent && (await onAssign(note.trim() || null, sent === 'copied'))) onClose()
    setSaving(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    finish('send')
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="send-driver-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-md sm:rounded-2xl sm:open:animate-zoom-in"
    >
      {open && (
        <form onSubmit={submit} className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="send-driver-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <IconButton icon={X} label={t.common.close} onClick={onClose} className="-mr-2" />
          </div>
          <p className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-6 whitespace-pre-line break-words text-slate-700">
            {driverMessage(t, order, store.data)}
          </p>
          <Field
            label={courier ? o.trackingNumber : o.driverNote}
            hint={courier ? o.trackingHint(courier) : o.driverNoteHint}
            className="mt-4"
          >
            <Input maxLength={200} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {courier ? (
            // A courier's parcel goes to a branch: what to keep is the
            // tracking number; sharing the details is the extra (UX check #13).
            <>
              <Button loading={saving === 'save'} disabled={saving !== null} onClick={() => finish('save')} className="mt-5 w-full">
                {o.saveSentWith(courier)}
              </Button>
              <Button
                type="submit"
                variant="secondary"
                icon={Send}
                loading={saving === 'send'}
                disabled={saving !== null}
                className="mt-2 w-full"
              >
                {o.shareDetails}
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" icon={Send} loading={saving === 'send'} disabled={saving !== null} className="mt-5 w-full">
                {o.send}
              </Button>
              <Button
                variant="ghost"
                loading={saving === 'save'}
                disabled={saving !== null}
                onClick={() => finish('save')}
                className="mt-2 w-full"
              >
                {o.saveWithoutSending}
              </Button>
            </>
          )}
        </form>
      )}
    </dialog>
  )
}

/** Once someone is delivering: the message again, without changing
 * anything (a new driver, a lost message). */
export function SendAgain({ order }: { order: Order }) {
  const t = useT()
  const store = useStore()
  const share = useShareWithDriver()
  return (
    <button
      type="button"
      onClick={() => share(driverMessage(t, order, store.data))}
      className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-navy-700 link focus-visible:outline-2 focus-visible:outline-navy-600 sm:min-h-9"
    >
      <Send aria-hidden className="size-3.5" />
      {t.orders.sendAgain}
    </button>
  )
}
