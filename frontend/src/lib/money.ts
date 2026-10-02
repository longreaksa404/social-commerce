import type { Currency } from './types.ts'

/** "$12.50" for USD, "50,000៛" for riel (whole numbers, symbol after). */
export function formatMoney(amount: string | number, currency: Currency): string {
  const value = Number(amount)
  if (currency === 'KHR') {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}៛`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Step for price inputs: riel has no cents. */
export function priceStep(currency: Currency): string {
  return currency === 'KHR' ? '1' : '0.01'
}

/** "$8.00", or "$8.00 – $12.00" when the prices differ. */
export function formatPriceRange(low: string | number, high: string | number, currency: Currency): string {
  return Number(low) === Number(high)
    ? formatMoney(low, currency)
    : `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`
}
