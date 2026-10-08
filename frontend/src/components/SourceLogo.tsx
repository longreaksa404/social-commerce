import { useId } from 'react'
import { hasLogo, LOGO_PATHS } from '../lib/sourceLogos.ts'

/** A place's logo (Facebook, TikTok, Instagram, Telegram, Messenger) in
 * its own colours, as the apps show it (founder's pick 4A, 2026-10-08):
 * square, sized by `className`. Decorative: the place's name is always
 * written beside it. Nothing for a place without a logo. */
export function SourceLogo({ source, className = 'size-10' }: { source: string | null | undefined; className?: string }) {
  // Gradients need an id that's unique on the page.
  const id = `logo${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  if (!hasLogo(source)) return null
  const d = LOGO_PATHS[source]
  // TikTok's black tile gets a faint edge, so it shows on a dark page.
  const edge = source === 'tiktok' ? 'rounded-[25%] ring-1 ring-white/20' : ''
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${edge} ${className}`}>
      {source === 'facebook' && (
        <>
          <circle cx="12" cy="12" r="10.6" fill="#fff" />
          <path d={d} fill="#0866ff" />
        </>
      )}
      {source === 'telegram' && (
        <>
          <circle cx="12" cy="12" r="10.6" fill="#fff" />
          <path d={d} fill="#26a5e4" />
        </>
      )}
      {source === 'messenger' && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#0099ff" />
              <stop offset=".6" stopColor="#a033ff" />
              <stop offset=".9" stopColor="#ff5280" />
              <stop offset="1" stopColor="#ff7061" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="11.6" r="9" fill="#fff" />
          <path d={d} fill={`url(#${id})`} />
        </>
      )}
      {source === 'instagram' && (
        <>
          <defs>
            <radialGradient id={id} cx=".28" cy="1.08" r="1.25">
              <stop offset="0" stopColor="#fdf497" />
              <stop offset=".08" stopColor="#fdf497" />
              <stop offset=".45" stopColor="#fd5949" />
              <stop offset=".62" stopColor="#d6249f" />
              <stop offset=".92" stopColor="#285aeb" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill={`url(#${id})`} />
          <path d={d} fill="#fff" transform="translate(5 5) scale(.5833)" />
        </>
      )}
      {source === 'tiktok' && (
        <>
          <rect width="24" height="24" rx="6" fill="#000" />
          <g transform="translate(5.6 5.2) scale(.55)">
            <path d={d} fill="#25f4ee" transform="translate(-.9 -.7)" />
            <path d={d} fill="#fe2c55" transform="translate(.9 .7)" />
            <path d={d} fill="#fff" />
          </g>
        </>
      )}
    </svg>
  )
}
