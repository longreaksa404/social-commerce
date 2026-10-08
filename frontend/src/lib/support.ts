/** Oak Order's own Telegram account (VITE_SUPPORT_TELEGRAM, no @), for
 * sellers who need help. Empty hides every "Message support" link. */
export const SUPPORT_TELEGRAM = (import.meta.env.VITE_SUPPORT_TELEGRAM ?? '').trim().replace(/^@/, '')

/** A chat with support, the seller's message already typed. */
export function supportLink(text: string): string {
  return `https://t.me/${SUPPORT_TELEGRAM}?text=${encodeURIComponent(text)}`
}
