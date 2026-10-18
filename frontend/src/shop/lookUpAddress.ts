import type { Lang } from '../i18n/core.ts'

type Place = { lat: number; lng: number }

// OpenStreetMap's free address lookup (Nominatim): no key, at most one
// request a second per user, the browser's Referer says who's asking.
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'

// Small to big: house, street, village, sangkat/commune, khan/district,
// city, province. Shop names, postcodes and the country are left out.
const PARTS = ['road', 'hamlet', 'neighbourhood', 'village', 'suburb', 'quarter', 'town', 'city', 'state'] as const

/** The address at a map pin, in the page's language, e.g. "Street 396,
 * Sangkat Boeng Keng Kang Ti Bei, Khan Boeng Keng Kang, Phnom Penh".
 * Null when the lookup fails or finds nothing; the customer types it. */
export async function lookUpAddress(place: Place, lang: Lang, signal: AbortSignal): Promise<string | null> {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(place.lat),
    lon: String(place.lng),
    zoom: '18',
    'accept-language': lang,
  })
  try {
    const response = await fetch(`${NOMINATIM}?${query}`, { signal })
    if (!response.ok) return null
    const found: { address?: Record<string, string> } = await response.json()
    const address = found.address ?? {}
    const parts: string[] = []
    for (const key of PARTS) {
      const part = address[key]?.trim()
      if (part && !parts.includes(part)) parts.push(part)
    }
    if (address.house_number && address.road) {
      const house = lang === 'km' ? `ផ្ទះលេខ ${address.house_number}` : `No. ${address.house_number}`
      parts.unshift(house)
    }
    // Khmer addresses are written with spaces between the parts.
    return parts.length ? parts.join(lang === 'km' ? ' ' : ', ') : null
  } catch {
    return null
  }
}
