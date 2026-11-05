import { Send } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '../../i18n/useT.ts'
import { SUPPORT_TELEGRAM } from '../../lib/support.ts'
import { LegalLinks } from '../Legal.tsx'
import { solidButton } from './buttons.ts'

/** The last call, help on Telegram (when it's set up), the legal pages. */
export function Bottom() {
  const t = useT()
  const bottom = t.home.bottom
  return (
    <footer className="relative isolate overflow-hidden px-5 pt-28 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:px-8">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(50rem_26rem_at_50%_0%,color-mix(in_oklab,var(--color-night-glow)_70%,transparent),transparent_70%)]"
      />
      <div className="mx-auto max-w-6xl text-center">
        <h2 data-reveal="wipe" className="home-display mx-auto max-w-3xl text-[clamp(2rem,7vw,3.75rem)]">
          {bottom.title}
        </h2>
        <Link data-cta="create" to="/register" className={`${solidButton} mt-9`}>
          {t.auth.createYourStore}
        </Link>
        {SUPPORT_TELEGRAM && (
          <p className="mt-6">
            <a
              href={`https://t.me/${SUPPORT_TELEGRAM}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-white/70 hover:text-white"
            >
              <Send aria-hidden className="size-4" />
              {bottom.help}
            </a>
          </p>
        )}
        <div className="mt-20 flex flex-col items-center gap-2 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <LegalLinks onDark className="justify-center" />
          <p className="text-sm text-white/40">© Oak Solutions</p>
        </div>
      </div>
    </footer>
  )
}
