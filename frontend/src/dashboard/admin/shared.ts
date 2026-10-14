import { formatDate } from '../../lib/orders.ts'
import type { PlanStage } from '../../lib/types.ts'

/** How each plan stage looks on the admin page. */
export const STAGE_TONE: Record<PlanStage, 'neutral' | 'amber' | 'red'> = {
  active: 'neutral',
  ending_soon: 'amber',
  overdue: 'amber',
  stopped: 'red',
}

/** A calendar day from the API with its year: "Nov 30, 2026". */
export const day = (ymd: string) => formatDate(`${ymd}T00:00`)
