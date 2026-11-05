import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Spinner } from '../../components/ui.tsx'
import { BAR_COLORS, currentTheme } from '../../theme/theme.ts'
import { Atmosphere } from './Atmosphere.tsx'
import { Bottom } from './Bottom.tsx'
import { Features } from './Features.tsx'
import { Hero } from './Hero.tsx'
import './home.css'
import { HowItWorks } from './HowItWorks.tsx'
import { Pricing } from './Pricing.tsx'
import { Questions } from './Questions.tsx'
import { TopBar } from './TopBar.tsx'
import { useIntro } from './useIntro.ts'
import { useReveal } from './useReveal.ts'

/** The start page, for sellers who've never heard of Oak Order (founder's
 * picks 2026-11-04, docs/superpowers/specs/2026-11-04-home-page-design.md):
 * what it does, How it works on a phone, the price, questions, a demo shop
 * to try. Logged-in sellers go straight to their dashboard. */
export function Home() {
  const { status } = useAuth()
  useNightBehind()
  if (status === 'loading') return <Spinner />
  // 'unreachable' has a stored session: the dashboard shows the retry.
  if (status === 'authenticated' || status === 'unreachable') return <Navigate to="/dashboard" replace />
  return <HomePage />
}

const NIGHT = '#0b1320'

/** Night navy behind the page and in the phone's browser bar while it's
 * open, so the opening starts dark and overscrolling shows no white; put
 * back when the page is left, a redirect to the dashboard included.
 * index.html sets the same before the first paint. */
function useNightBehind() {
  useEffect(() => {
    const root = document.documentElement
    const bar = document.querySelector('meta[name="theme-color"]')
    root.classList.add('home-night')
    bar?.setAttribute('content', NIGHT)
    return () => {
      root.classList.remove('home-night')
      bar?.setAttribute('content', BAR_COLORS[currentTheme()])
    }
  }, [])
}

function HomePage() {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root)
  const intro = useIntro()
  return (
    <div ref={root} className="home relative isolate min-h-dvh overflow-x-clip text-white">
      <Atmosphere />
      <TopBar />
      <main data-home data-intro={intro}>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <Questions />
        <Bottom />
      </main>
    </div>
  )
}
