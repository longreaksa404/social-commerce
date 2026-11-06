import { useSearchParams } from 'react-router'

/** A list page's filter, search and sort kept in the address (founder's
 * picks 6A and 7A, 2026-11-06): opening a row, Back, a reload or a copied
 * link come back to the same list. `listSearch`: the list's part of the
 * address ("?show=claimed&q=sokha"), for links to a row and back to the
 * list; a shop's `tab` isn't part of it. */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const update = (changes: Record<string, string | null>) => {
    // From the address as it is now, not this render's copy: two quick
    // changes (a chip, then typing) would otherwise undo each other.
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const list = new URLSearchParams(params)
  list.delete('tab')
  const text = list.toString()
  return { params, update, listSearch: text ? `?${text}` : '' }
}
