import { useLocation } from 'react-router'

/** Where a page's back arrow goes: the `back` that the link here passed in
 * its state (e.g. from a customer or a notification), or `fallback`. */
export function useBackTo(fallback: string): string {
  const from = (useLocation().state as { back?: unknown } | null)?.back
  return typeof from === 'string' && from.startsWith('/dashboard/') ? from : fallback
}
