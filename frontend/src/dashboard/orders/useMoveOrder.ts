import { buzz, confetti } from '../../components/effects.ts'
import { useFeedback } from '../../components/feedback.ts'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { errorText } from '../../lib/errors.ts'
import type { OrderStatus } from '../../lib/types.ts'
import { useChangeOrderStatus } from '../queries.ts'

// Ending an order: asks first, and its items go back into stock.
export const ENDS_ORDER = new Set<OrderStatus>(['rejected', 'cancelled'])

/** Moving an order to its next status (02 section 7.1), the same from the
 * order page and from a new order's buttons in the list: asks before
 * rejecting or cancelling, buzzes, says what changed, confetti on
 * completing. `onStale` runs when it changed on another device. */
export function useMoveOrder(id: string, number: number, onStale: () => void) {
  const { toast, confirm } = useFeedback()
  const t = useT()
  const o = t.orders
  const change = useChangeOrderStatus(id)

  async function move(status: OrderStatus, button: HTMLElement) {
    // Read now: the button goes once the order has moved on.
    const from = button.getBoundingClientRect()
    if (ENDS_ORDER.has(status)) {
      const reject = status === 'rejected'
      const ok = await confirm({
        title: reject ? o.rejectTitle(number) : o.cancelTitle(number),
        message: reject ? o.rejectMessage : o.cancelMessage,
        confirmLabel: reject ? o.rejectConfirm : o.cancelConfirm,
        danger: true,
      })
      if (!ok) return
    }
    try {
      await change.mutateAsync(status)
      buzz()
      // The end of the road for an order: a little celebration.
      if (status === 'completed') confetti(from.left + from.width / 2, from.top + from.height / 2)
      toast(o.changed(number, t.status.order[status]))
    } catch (error) {
      toast(errorText(error), 'error')
      // Most likely changed on another device: show where it is now.
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  return { move, change }
}
