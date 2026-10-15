import { buzz } from '../../components/effects.ts'
import { useFeedback } from '../../components/feedback.ts'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { errorText } from '../../lib/errors.ts'
import type { OrderStatus } from '../../lib/types.ts'
import { useChangeOrderStatus } from '../queries.ts'

// Ending an order: asks first, and its items go back into stock.
export const ENDS_ORDER = new Set<OrderStatus>(['rejected', 'cancelled'])

/** Moving an order to its next status (02 section 7.1) from the order
 * page: asks before rejecting or cancelling, buzzes (not on Complete: no
 * celebration there, founder 2026-10-15), says what changed. `move`
 * resolves to whether it moved. `onStale` runs when it changed on another
 * device. */
export function useMoveOrder(id: string, number: number, onStale: () => void) {
  const { toast, confirm } = useFeedback()
  const t = useT()
  const o = t.orders
  const change = useChangeOrderStatus(id)

  async function move(status: OrderStatus): Promise<boolean> {
    if (ENDS_ORDER.has(status)) {
      const reject = status === 'rejected'
      const ok = await confirm({
        title: reject ? o.rejectTitle(number) : o.cancelTitle(number),
        message: reject ? o.rejectMessage : o.cancelMessage,
        confirmLabel: reject ? o.rejectConfirm : o.cancelConfirm,
        danger: true,
      })
      if (!ok) return false
    }
    try {
      await change.mutateAsync(status)
      if (status !== 'completed') buzz()
      toast(o.changed(number, t.status.order[status]))
      return true
    } catch (error) {
      toast(errorText(error), 'error')
      // Most likely changed on another device: show where it is now.
      if (error instanceof ApiError && error.status === 409) onStale()
      return false
    }
  }

  return { move, change }
}
