import { useState } from 'react'

/** A customer's Telegram profile photo (founder, 2026-10-20), round, on
 * their info and in the lists (test list #6, 2026-10-24): nothing at all
 * when they have none (most guests), so the card stays as it was; with
 * `name`, the name's first letter in a grey circle instead, so a list's
 * rows line up. */
export function CustomerPhoto({
  url,
  name,
  className = 'size-10',
}: {
  url: string | null
  name?: string
  className?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!url || failed === url) {
    if (!name) return null
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500 ${className}`}
      >
        {[...name.trim()][0]?.toUpperCase()}
      </span>
    )
  }
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
