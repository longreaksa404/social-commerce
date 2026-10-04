import { formatMoney } from './money.ts'
import type { Amount, Currency } from './types.ts'

/** "$40.00"; "$40.00 + 80,000៛" if the shop changed its currency; nothing
 * spent shows as 0 in the shop's currency. */
export function formatSpent(spent: Amount[], currency: Currency): string {
  if (spent.length === 0) return formatMoney(0, currency)
  return spent.map((a) => formatMoney(a.amount, a.currency)).join(' + ')
}
