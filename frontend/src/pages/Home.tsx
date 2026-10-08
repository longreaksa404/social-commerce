import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Spinner } from '../components/ui.tsx'
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import { BrandMark } from './AuthLayout.tsx'

/** The start page, before logging in (founder's pick, 2026-10-08): deep
 * navy, the name Oak Order in very large letters, one line on what it's
 * for, and the two ways in. The same navy in light and
 * dark: it's the brand, not the page. */
export function Home() {
  const { status } = useAuth()
  const t = useT()
  const home = t.auth.home

  if (status === 'loading') return <Spinner />
  // 'unreachable' has a stored session: the dashboard shows the retry.
  if (status === 'authenticated' || status === 'unreachable') return <Navigate to="/dashboard" replace />

  return (
    <main className="flex min-h-dvh flex-col bg-[#182841] px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-white sm:px-10 lg:px-16">
      <div className="flex items-center justify-between gap-3">
        <BrandMark onDark />
        <LanguageSwitch onDark />
      </div>

      <div className="my-auto py-12">
        <h1 lang="en" className="animate-rise text-[clamp(5.5rem,24vw,13rem)] leading-[0.95] font-bold tracking-tight">
          Oak
          <br />
          Order
        </h1>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/85 sm:text-2xl">{home.tagline}</p>
        <div className="mt-10 hidden gap-3 sm:flex">
          <Actions />
        </div>
      </div>

      {/* Phones: at the bottom, where thumbs are. */}
      <div className="flex flex-col gap-3 sm:hidden">
        <Actions />
      </div>
    </main>
  )
}

function Actions() {
  const t = useT()
  const button =
    'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]'
  return (
    <>
      <Link to="/register" className={`${button} bg-white text-[#182841] hover:bg-white/90`}>
        {t.auth.createYourStore}
      </Link>
      <Link to="/login" className={`${button} border border-white/35 text-white hover:bg-white/10`}>
        {t.auth.logIn}
      </Link>
    </>
  )
}
