import { useQuery } from '@tanstack/react-query'
import { api } from './api.ts'

type PlanPricesIn = { month: string; year: string; trial_days: number; changed_on: string | null }

export type PlanPrices = {
  /** "$9.99" */
  month: string
  /** "$99" */
  year: string
  /** What a year saves against 12 months, "$20.88"; empty if nothing. */
  save: string
  /** The free trial's days, "30". */
  trial: string
  /** The day the prices or the trial last changed (the Terms' date). */
  changedOn: string | null
}

// "9.99" → "$9.99", "99.00" → "$99", as Settings → Plan writes them.
const usd = (amount: number) => `$${amount.toFixed(2).replace(/\.00$/, '')}`
const cents = (amount: string) => Math.round(Number(amount) * 100)

// Today's prices, shown while the API answers, or if it can't.
const TODAY: PlanPricesIn = { month: '9.99', year: '99.00', trial_days: 30, changed_on: null }

/** Oak Order's prices and free trial (public `GET /plan/prices`, set in the
 * admin), formatted for a page: the Terms and the start page. */
export function usePlanPrices(): PlanPrices {
  const query = useQuery({
    queryKey: ['plan-prices'],
    queryFn: () => api<PlanPricesIn>('/plan/prices', { auth: false }),
    staleTime: 5 * 60_000,
  })
  const data = query.data ?? TODAY
  const save = cents(data.month) * 12 - cents(data.year)
  return {
    month: usd(cents(data.month) / 100),
    year: usd(cents(data.year) / 100),
    save: save > 0 ? usd(save / 100) : '',
    trial: String(data.trial_days),
    changedOn: data.changed_on,
  }
}
