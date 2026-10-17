import { Send } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import { Button } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { deliveryAction } from '../../lib/delivery.ts'
import type { Order } from '../../lib/types.ts'
import { cashDue, nextStep } from './orderSteps.ts'
import type { OrderActions } from './useOrderActions.ts'

/** Phones (founder's pick 6A, 2026-10-15): while the shaded row's dark
 * button is off the screen (scrolled away to check the items or the
 * address, or still below on a small phone), the same buttons sit at the
 * bottom, under the thumb. It watches that button, not the whole card: on
 * an order with one or two items the page is too short for the card to
 * leave the screen (the founder never saw the bar). The same buttons as in
 * the card, so they record the same things. Laptops show the order beside
 * the list, so not there. */
export function PinnedStep({
  order,
  actions,
  card,
  paying,
  onPay,
  onSend,
}: {
  order: Order
  actions: OrderActions
  /** The status card, holding the dark button (`data-next-step`). */
  card: RefObject<HTMLElement | null>
  paying: boolean
  onPay: () => void
  onSend: () => void
}) {
  const t = useT()
  const o = t.orders
  const [hidden, setHidden] = useState(false)
  const step = nextStep(order)

  // Looked up again whenever the order moves on: the dark button changes.
  useEffect(() => {
    const button = card.current?.querySelector('[data-next-step]')
    if (!button) return
    // A button behind the bar itself counts as off the screen.
    const watch = new IntersectionObserver(([entry]) => setHidden(!entry.isIntersecting), {
      rootMargin: '0px 0px -88px 0px',
    })
    watch.observe(button)
    return () => watch.disconnect()
  }, [card, step, order.updated_at, paying])

  if (!step) return null
  const { busy, change, move } = actions
  const pickup = order.delivery.method === 'pickup'
  let buttons
  switch (step) {
    case 'accept':
      buttons = (
        <>
          <Button variant="danger" disabled={busy} onClick={() => move('rejected')}>
            {o.action.rejected}
          </Button>
          <Button
            loading={change.isPending && change.variables === 'accepted'}
            disabled={busy}
            onClick={() => move('accepted')}
            className="flex-1"
          >
            {o.action.accepted}
          </Button>
        </>
      )
      break
    case 'retryPayment':
      buttons = (
        <>
          {order.next_statuses.includes('cancelled') && (
            <Button variant="danger" disabled={busy} onClick={() => move('cancelled')}>
              {o.action.cancelled}
            </Button>
          )}
          <Button loading={actions.payment.isPending} disabled={busy} onClick={actions.notPaid} className="flex-1">
            {o.backToNotPaid}
          </Button>
        </>
      )
      break
    case 'markPaid':
      buttons = (
        <Button disabled={busy} onClick={onPay} className="flex-1">
          {o.markPaid}
        </Button>
      )
      break
    case 'send':
      buttons = (
        <Button icon={Send} disabled={busy} onClick={onSend} className="flex-1">
          {order.delivery.status === 'failed'
            ? t.status.deliveryAction.tryAgain
            : order.delivery.courier
              ? t.status.deliveryAction.sendWith(order.delivery.courier)
              : o.sendToDriver}
        </Button>
      )
      break
    case 'deliver':
      buttons = cashDue(order) ? (
        <>
          <Button loading={actions.handover.isPending} disabled={busy} onClick={actions.handOver} className="flex-1">
            {pickup ? o.collectedCash : o.cashHandover}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => actions.deliver()}>
            {deliveryAction(t, order.delivery, 'delivered')}
          </Button>
        </>
      ) : (
        <Button loading={actions.delivery.isPending} disabled={busy} onClick={() => actions.deliver()} className="flex-1">
          {deliveryAction(t, order.delivery, 'delivered')}
        </Button>
      )
      break
    case 'complete':
      buttons = cashDue(order) ? (
        <Button loading={actions.payment.isPending} disabled={busy} onClick={actions.cashAndComplete} className="flex-1">
          {o.cashAndComplete}
        </Button>
      ) : (
        <Button
          loading={change.isPending && change.variables === 'completed'}
          disabled={busy}
          onClick={() => move('completed')}
          className="flex-1"
        >
          {o.action.completed}
        </Button>
      )
      break
  }
  // Not while the Mark paid form is open: that's where the next tap goes.
  const show = hidden && !paying
  return (
    <div
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-3xl gap-2.5">{buttons}</div>
    </div>
  )
}
