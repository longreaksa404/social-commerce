import { Package, Store, Tags } from 'lucide-react'
import type { Messages } from '../i18n/core.ts'
import type { LinkTarget, ShareLink } from './types.ts'

export const TARGET_ICONS: Record<LinkTarget, typeof Store> = { store: Store, product: Package, category: Tags }

/** The places a seller picks from when making a link; "Other" lets them
 * type their own. The key is what's saved as the link's (and its orders')
 * source. */
export const LINK_SOURCES = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'messenger', label: 'Messenger' },
] as const

export function sourceLabel(source: string): string {
  return LINK_SOURCES.find((s) => s.key === source)?.label ?? source
}

/** What the link opens: "Whole shop", a product's or a category's name. */
export function linkTargetName(t: Messages, link: ShareLink): string {
  if (link.target_type === 'store') return t.links.wholeShop
  if (link.target_name) return link.target_name
  return link.target_type === 'category' ? t.links.deletedCategory : t.links.product
}

/** "TikTok · September sale" */
export function linkPlace(link: ShareLink): string {
  return [link.source && sourceLabel(link.source), link.campaign].filter(Boolean).join(' · ')
}

/** The full address to share, on this site. */
export function linkUrl(path: string): string {
  return `${window.location.origin}${path}`
}
