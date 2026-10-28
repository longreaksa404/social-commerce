import { formatDate } from '../lib/orders.ts'
import type { PlanStage } from '../lib/types.ts'

/** How each plan stage looks on the admin page. */
export const STAGE_TONE: Record<PlanStage, 'neutral' | 'amber' | 'red'> = {
  setup: 'neutral',
  active: 'neutral',
  ending_soon: 'amber',
  overdue: 'amber',
  stopped: 'red',
}

/** A calendar day from the API with its year: "Nov 30, 2026" ("" for none:
 * a shop in setup has no paid-until date). */
export const day = (ymd: string | null) => (ymd ? formatDate(`${ymd}T00:00`) : '')

/** A calendar day from the API, short and in English (the admin is
 * English only): "Fri 31 Oct". */
export const shortDay = (ymd: string) =>
  new Date(`${ymd}T00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
