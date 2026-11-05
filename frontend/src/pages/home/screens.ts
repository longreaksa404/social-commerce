import type { Lang } from '../../i18n/core.ts'

/** The live demo shop, Oak Phone (docs/MARKETING_FACTS.md §8). Its orders
 * reach the founder; the page says so under the button. */
export const DEMO_SHOP = 'zdpb5d'

/** The app's screens the phone shows: WebPs in public/home/<lang>/, made by
 * backend/marketing/home_images.py from the marketing pictures. */
export type Screen = 'shop' | 'share' | 'checkout' | 'khqr' | 'orders'

/** How it works, step by step. */
export const STEP_SCREENS: Screen[] = ['share', 'checkout', 'khqr', 'orders']

export function screenUrl(lang: Lang, screen: Screen): string {
  return `/home/${lang}/${screen}.webp`
}
