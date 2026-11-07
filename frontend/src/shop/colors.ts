import { useEffect } from 'react'
import type { ShopColor } from '../lib/types.ts'

/** The colours a seller can pick for their shop (founder's pick 1A,
 * 2026-10-15), in Settings' order: deep ones with white words on their
 * buttons, then light ones with dark words (the founder's request the same
 * day). Each is a light and a dark scale in colors.css; navy is the app's own. */
export const DEEP_COLORS: ShopColor[] = ['navy', 'teal', 'forest', 'olive', 'coffee', 'wine', 'plum', 'charcoal']
export const LIGHT_COLORS: ShopColor[] = ['pink', 'sky', 'mint', 'peach', 'lilac', 'sand']

/** While a public shop page shows: its colour on <html>, so the sheets and
 * toasts opened over the page take it too. Gone again on leaving. Seller
 * screens stay Oak Order navy (founder's pick 8A, 2026-11-07). */
export function useShopColor(color: ShopColor | undefined) {
  useEffect(() => {
    if (!color || color === 'navy') return
    const root = document.documentElement
    root.dataset.shopColor = color
    return () => {
      delete root.dataset.shopColor
    }
  }, [color])
}
