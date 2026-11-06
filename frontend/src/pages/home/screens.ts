import type { Lang } from '../../i18n/core.ts'

/** The live demo shop, Oak Wear (docs/MARKETING_FACTS.md §8). Its orders
 * reach the founder; the page says so under the button. */
export const DEMO_SHOP = 'zdpb5d'

/** The app's screens the phone shows: WebPs in public/home/<lang>/, made by
 * backend/marketing/home_images.py from the marketing pictures. */
export type Screen = 'shop' | 'share' | 'checkout' | 'khqr' | 'orders'

/** How it works, step by step. */
export const STEP_SCREENS: Screen[] = ['share', 'checkout', 'khqr', 'orders']

/** Which step a pinned stage `progress` (0–1) through `count` steps shows. */
export function stepAt(progress: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)))
}

export function screenUrl(lang: Lang, screen: Screen): string {
  return `/home/${lang}/${screen}.webp`
}

/** The seller's Orders page on a laptop (LaptopStill). */
export function laptopUrl(lang: Lang): string {
  return `/home/${lang}/laptop.webp`
}
