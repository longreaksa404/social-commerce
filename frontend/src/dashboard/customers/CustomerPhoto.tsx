import { useState } from 'react'

/** A customer's Telegram profile photo (founder, 2026-10-20), round, on
 * their info: nothing at all when they have none (most guests), so the
 * card stays as it was. */
export function CustomerPhoto({ url, className = 'size-10' }: { url: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!url || failed === url) return null
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(url)}
      className={`shrink-0 rounded-full bg-slate-100 object-cover ${className}`}
    />
  )
}
