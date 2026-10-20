import { Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Field, IconButton, TextArea } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { errorText } from '../../lib/errors.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { Order } from '../../lib/types.ts'
import { useMessageCustomer, useStore } from '../queries.ts'

/** "Message on Telegram" (founder's pick 2026-10-20): for a customer who
 * gets updates there, a message Oak's bot sends them with a button to
 * reply to the shop's own Telegram (or Messenger). Above all for a phone
 * that doesn't answer: a wrong digit, or a second SIM. Ready messages fill
 * the box, in the seller's language, to change before Send. A bottom sheet
 * on phones, a centred card from `sm` up, like Send to driver. */
export function MessageCustomerSheet({
  order,
  open,
  onClose,
  onGone,
}: {
  order: Order
  open: boolean
  onClose: () => void
  /** The customer stopped the bot: the order no longer offers this. */
  onGone: () => void
}) {
  const o = useT().orders
  const t = useT()
  const { toast } = useFeedback()
  const store = useStore().data
  const send = useMessageCustomer(order.id)
  const dialog = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  const ready = [
    { label: o.ready.cantReach.label, text: o.ready.cantReach.text(formatPhone(order.customer.phone)) },
    { label: o.ready.driverNear.label, text: o.ready.driverNear.text },
  ]
  const noReply = store && !store.telegram_username && !store.messenger_username && !store.contact_phone

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      setText('')
      el.showModal()
    } else if (!open && el.open) el.close()
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await send.mutateAsync(text.trim())
      toast(o.messageSent)
      onClose()
    } catch (error) {
      toast(errorText(error), 'error')
      if (error instanceof ApiError && error.status === 409) {
        onClose()
        onGone()
      }
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby="message-customer-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-xl open:animate-sheet-up sm:m-auto sm:max-w-md sm:rounded-2xl sm:open:animate-zoom-in"
    >
      {open && (
        <form onSubmit={submit} className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="message-customer-title" className="min-w-0 text-lg font-semibold break-words text-slate-900">
              {o.messageTitle(order.customer.name)}
            </h2>
            <IconButton icon={X} label={t.common.close} onClick={onClose} className="-mr-2" />
          </div>
          <div role="group" aria-label={o.readyMessages} className="mt-3 flex flex-wrap gap-2">
            {ready.map((message) => (
              <button
                key={message.label}
                type="button"
                aria-pressed={text === message.text}
                onClick={() => setText(message.text)}
                className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 aria-pressed:border-navy-600 aria-pressed:bg-navy-50 aria-pressed:text-navy-800 sm:min-h-9"
              >
                {message.label}
              </button>
            ))}
          </div>
          <Field label={o.messageLabel} className="mt-4">
            <TextArea rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          {noReply && <p className="mt-2 text-sm font-medium text-amber-700">{o.noReplyWay}</p>}
          <Button type="submit" icon={Send} loading={send.isPending} disabled={!text.trim()} className="mt-5 w-full">
            {o.send}
          </Button>
        </form>
      )}
    </dialog>
  )
}
