import { useState } from 'react'

/** A link name from a shop's name, like the API's `slugify`: lowercase
 * English letters and numbers joined by hyphens. Empty for a name with
 * none (one in Khmer only): the API then picks a random one. */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '')
  return slug.length >= 2 ? slug : ''
}

/** The shop's link at sign-up: made from the store name as it's typed,
 * until the seller types their own. */
export function useShopLink(storeName: string) {
  const [typed, setTyped] = useState<string | null>(null)
  return { slug: typed ?? slugify(storeName), setSlug: setTyped }
}
