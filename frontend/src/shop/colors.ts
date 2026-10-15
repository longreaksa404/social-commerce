import { useEffect } from 'react'
import type { ShopColor } from '../lib/types.ts'

/** The colours a seller can pick for their shop (founder's pick 1A,
 * 2026-10-15), in Settings' order. Each is a light and a dark scale in
 * colors.css; navy is the app's own. */
export const SHOP_COLORS: ShopColor[] = ['navy', 'teal', 'forest', 'olive', 'coffee', 'wine', 'plum', 'charcoal']

/** While a shop's page or its seller's dashboard shows (founder,
 * 2026-10-15): its colour on <html>, so the sheets and toasts opened over
 * the page take it too. Gone again on leaving. */
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
