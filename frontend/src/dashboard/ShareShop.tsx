import { Share2 } from 'lucide-react'
import { useFeedback } from '../components/feedback.ts'
import { useT } from '../i18n/useT.ts'
import { linkUrl } from '../lib/links.ts'
import { useStore } from './queries.ts'

/** The shop's plain link: the phone's share list (Telegram, Messenger,
 * Facebook...), or copied on a laptop. Sharing the shop is what a seller
 * does most after orders (UX check #10, 2026-10-17). */
export function useShareShop() {
  const store = useStore()
  const { toast } = useFeedback()
  const d = useT().dashboard
  const url = store.data ? linkUrl(`/shop/${store.data.slug}`) : null

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast(d.shopLinkCopied)
    } catch {
      toast(d.shopLinkCopyFailed, 'error')
    }
  }

  async function share() {
    if (!url || !store.data) return
    const phone = window.matchMedia('(pointer: coarse)').matches
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: store.data.name, url })
        return
      } catch (error) {
        // Closed the share list: nothing to do.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copy()
  }

  return { url, copy, share }
}

/** Beside the bell: one tap to share the shop's link. */
export function ShareShopButton() {
  const { url, share } = useShareShop()
  const d = useT().dashboard
  if (!url) return null
  return (
    <button
      type="button"
      onClick={share}
      aria-label={d.shareShop}
      title={d.shareShop}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      <Share2 aria-hidden className="size-5" />
    </button>
  )
}
