import { useSyncExternalStore } from 'react'
import { useHasProduct, useRole, useStore } from '../queries.ts'

/** The steps to get a new shop ready (founder's pick 7C, 2026-10-09), in
 * order. The first three are what taking orders needs; the rest help
 * customers trust and reach the shop. */
export type SetupStep = 'product' | 'delivery' | 'payments' | 'telegram' | 'contact' | 'logo'

export const ESSENTIAL: ReadonlySet<SetupStep> = new Set(['product', 'delivery', 'payments'])

export const STEP_TARGETS: Record<SetupStep, string> = {
  product: '/dashboard/products/new',
  delivery: '/dashboard/settings/delivery',
  payments: '/dashboard/settings/payments',
  telegram: '/dashboard/settings/telegram',
  contact: '/dashboard/settings/contact',
  logo: '/dashboard/settings/shop',
}

// "Hide this list", per device and shop.
const HIDDEN_KEY = (storeId: string) => `sc.setup.hidden.${storeId}`
const listeners = new Set<() => void>()

function isHidden(storeId: string): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY(storeId)) === '1'
  } catch {
    return false
  }
}

export function hideSetup(storeId: string) {
  try {
    localStorage.setItem(HIDDEN_KEY(storeId), '1')
  } catch {
    // Private mode etc.: it shows again next time.
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export type Setup = {
  steps: { step: SetupStep; done: boolean }[]
  done: number
  /** Show the checklist row in Settings: not all done, not hidden. */
  show: boolean
  /** The dot on the Settings tab: something taking orders needs is missing. */
  needsAttention: boolean
}

/** Where the shop's setup stands, for its owner; null for staff or while
 * loading. */
export function useSetup(): Setup | null {
  const store = useStore()
  const hasProduct = useHasProduct()
  const role = useRole()
  const storeId = store.data?.id ?? ''
  const hidden = useSyncExternalStore(subscribe, () => (storeId ? isHidden(storeId) : false))
  if (role !== 'owner' || !store.data || hasProduct.data === undefined) return null
  const s = store.data
  const steps: { step: SetupStep; done: boolean }[] = [
    { step: 'product', done: hasProduct.data },
    { step: 'delivery', done: s.delivery_set_up },
    { step: 'payments', done: s.payment_set_up },
    // Only once the platform's bot is set up.
    ...(s.telegram_bot_available ? [{ step: 'telegram' as const, done: s.telegram_connected }] : []),
    { step: 'contact', done: Boolean(s.telegram_username || s.messenger_username || s.contact_phone) },
    { step: 'logo', done: s.logo_url !== null },
  ]
  const done = steps.filter((x) => x.done).length
  return {
    steps,
    done,
    show: !hidden && done < steps.length,
    needsAttention: !hidden && steps.some((x) => ESSENTIAL.has(x.step) && !x.done),
  }
}
