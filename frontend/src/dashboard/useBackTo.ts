import { useLocation } from 'react-router'

/** Where a page's back arrow goes: the `back` that the link here passed in
 * its state (e.g. from a customer or a notification), or `fallback`. */
export function useBackTo(fallback: string): string {
  const from = (useLocation().state as { back?: unknown } | null)?.back
  return typeof from === 'string' && from.startsWith('/dashboard/') ? from : fallback
}

const NOTIFICATIONS = '/dashboard/notifications'

/** The bell opens notifications with the page it was tapped on as
 * `?from=`; the back arrow and the bell tapped again both go back there
 * (Orders if it was opened some other way). */
export function notificationsLink(pathname: string, search: string): string {
  if (pathname !== NOTIFICATIONS) return `${NOTIFICATIONS}?from=${encodeURIComponent(pathname + search)}`
  const from = new URLSearchParams(search).get('from')
  return from && from.startsWith('/dashboard/') && !from.startsWith(NOTIFICATIONS) ? from : '/dashboard/orders'
}
