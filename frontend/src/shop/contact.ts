import { useFeedback } from '../components/feedback.ts'
import { useT } from '../i18n/useT.ts'
import type { ShopStore } from '../lib/types.ts'

export type Channel = 'telegram' | 'messenger' | 'phone'

/** The ways this shop takes questions (Settings → Contact), in this order. */
export function contactChannels(shop: ShopStore): Channel[] {
  return [
    ...(shop.telegram_username ? (['telegram'] as const) : []),
    ...(shop.messenger_username ? (['messenger'] as const) : []),
    ...(shop.contact_phone ? (['phone'] as const) : []),
  ]
}

/** Asking stays outside the shop; ordering stays in it (01_PRODUCT.md
 * section 11). Telegram opens with `text` typed in. Messenger can't type it
 * (m.me has no way to), so it's copied to paste. A call is a call. */
export function useContactLink(shop: ShopStore, text: string) {
  const { toast } = useFeedback()
  const c = useT().shop.contact
  return (channel: Channel) => {
    if (channel === 'telegram') {
      return { href: `https://t.me/${shop.telegram_username}?text=${encodeURIComponent(text)}`, target: '_blank' }
    }
    if (channel === 'messenger') {
      return {
        href: `https://m.me/${shop.messenger_username}`,
        target: '_blank',
        onClick: () => {
          navigator.clipboard?.writeText(text).then(
            () => toast(c.copied),
            () => {},
          )
        },
      }
    }
    return { href: `tel:${shop.contact_phone}` }
  }
}
