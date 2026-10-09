import { SourceLogo } from '../components/SourceLogo.tsx'
import type { SocialProvider } from '../lib/types.ts'

/** Google's "G" (its sign-in brand mark), or the Facebook / TikTok logo the
 * app already draws for link sources. Decorative: the name is beside it. */
export function ProviderLogo({ provider, className = 'size-5' }: { provider: SocialProvider; className?: string }) {
  if (provider !== 'google') return <SourceLogo source={provider} className={className} />
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`shrink-0 ${className}`}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** "Continue with Facebook / TikTok", drawn like Google's own outline
 * button above it (white, 40 px, up to 400 px wide), so the three look like
 * one set. White in dark mode too, as Google's is. */
export function ProviderButton({
  provider,
  label,
  onClick,
}: {
  provider: SocialProvider
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex h-10 w-full max-w-[400px] items-center justify-center gap-2.5 rounded-[4px] border border-[#dadce0] bg-white px-3 text-sm font-medium text-[#3c4043] transition-colors hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
    >
      <ProviderLogo provider={provider} className="size-[18px]" />
      {label}
    </button>
  )
}
