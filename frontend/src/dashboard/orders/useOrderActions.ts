import { buzz } from '../../components/effects.ts'
import { useFeedback } from '../../components/feedback.ts'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { deliveryBadge } from '../../lib/delivery.ts'
import { errorText } from '../../lib/errors.ts'
import { formatMoney } from '../../lib/money.ts'
import type { DeliveryStatus, Order, OrderStatus } from '../../lib/types.ts'
import { useCashHandover, useRecordDelivery, useRecordPayment } from '../queries.ts'
import { useMoveOrder } from './useMoveOrder.ts'

/** Everything the order page records, shared by the status card, the ⋯
 * menu and the button pinned on phones. The three statuses never set each
 * other (02 section 7): each action records only what it says, except the
 * cash handover, which is both on purpose. Each resolves to whether it
 * worked; `onStale` runs when the order changed on another device, and
 * `onDecided` once a new order is accepted or rejected. */
export function useOrderActions(order: Order, onStale: () => void, onDecided?: (status: OrderStatus) => void) {
  const t = useT()
  const o = t.orders
  const { toast, confirm } = useFeedback()
  const amount = formatMoney(order.payment.amount, order.currency)
  const moneyNote =
    order.payment.status === 'paid'
      ? o.sendMoneyBack(amount)
      : order.payment.status === 'pending' && order.payment.claimed_at
        ? o.saysPaidMoneyBack(order.customer.name, amount)
        : null
  const { move: moveOrder, change } = useMoveOrder(order.id, order.number, onStale, moneyNote)
  const delivery = useRecordDelivery(order.id)
  const payment = useRecordPayment(order.id)
  const handover = useCashHandover(order.id)
  const busy = change.isPending || delivery.isPending || payment.isPending || handover.isPending
  const method = order.delivery.method
  const deliveryLabel = (status: DeliveryStatus) => deliveryBadge(t, method, status).label

  /** `what` goes in the toast ("Order #1005: Delivered"); null for none. */
  async function run(action: () => Promise<unknown>, what: string | null): Promise<boolean> {
    try {
      await action()
      buzz()
      if (what) toast(o.changed(order.number, what))
      return true
    } catch (error) {
      toast(errorText(error), 'error')
      if (error instanceof ApiError && error.status === 409) onStale()
      return false
    }
  }

  async function move(status: OrderStatus) {
    // `order` as it was when tapped: a new one accepted or rejected.
    if ((await moveOrder(status)) && order.status === 'pending') onDecided?.(status)
  }

  const recordDelivery = (status: DeliveryStatus, note: string | null, what: string | null) =>
    run(() => delivery.mutateAsync({ status, assignee_note: note }), what)
  const recordPayment = (status: 'paid' | 'failed' | 'pending', reference: string | null, what: string) =>
    run(() => payment.mutateAsync({ status, reference }), what)

  return {
    busy,
    change,
    delivery,
    payment,
    handover,
    move,
    /** Delivered, picked up, on the way (no note: the old one stays). */
    deliver: (status: DeliveryStatus = 'delivered') => recordDelivery(status, null, deliveryLabel(status)),
    /** Who's delivering, from Send to driver; `quiet` when a toast already said so. */
    assign: (note: string | null, quiet = false) => recordDelivery('assigned', note, quiet ? null : deliveryLabel('assigned')),
    /** Cash on delivery: delivered (or collected) and the cash in hand. */
    handOver: () => run(() => handover.mutateAsync(), method === 'pickup' ? o.collectedCash : o.cashHandover),
    markPaid: (reference: string | null) => recordPayment('paid', reference, o.paidToast),
    /** Paid already: delivered (or collected), then complete (UX check
     * #15). Two records, as the button says. */
    async deliverAndComplete() {
      if (await recordDelivery('delivered', null, null)) await moveOrder('completed')
    },
    /** A delivered cash order: the cash in hand, then complete (UX check
     * #8). Two records, as the button says; each stays if the other fails. */
    async cashAndComplete() {
      if (await recordPayment('paid', null, o.paidToast)) await moveOrder('completed')
    },
    async deliveryFailed() {
      await recordDelivery('failed', null, deliveryLabel('failed'))
    },
    async paymentFailed() {
      const ok = await confirm({ title: o.failTitle, message: o.failMessage, confirmLabel: o.paymentFailed, danger: true })
      if (ok) await recordPayment('failed', null, o.failedToast)
    },
    // Paid or failed back to not paid, any time (founder's pick 2C).
    async notPaid() {
      const ok = await confirm({
        title: o.unpayTitle(order.number),
        message: o.unpayMessage,
        confirmLabel: o.unpayConfirm,
        danger: true,
      })
      if (ok) await recordPayment('pending', null, o.unpaidToast)
    },
  }
}

export type OrderActions = ReturnType<typeof useOrderActions>
