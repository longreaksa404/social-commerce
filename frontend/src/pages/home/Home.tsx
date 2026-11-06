import { useRef } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Spinner } from '../../components/ui.tsx'
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
  if (status === 'loading') return <Spinner />
  // 'unreachable' has a stored session: the dashboard shows the retry.
  if (status === 'authenticated' || status === 'unreachable') return <Navigate to="/dashboard" replace />
  return <HomePage />
}

function HomePage() {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root)
  const intro = useIntro()
  return (
    <div ref={root} className="home relative isolate min-h-dvh text-slate-900">
      <TopBar />
      <main data-home data-intro={intro} className="overflow-x-clip pt-[calc(4rem+1px+env(safe-area-inset-top))]">
        <Hero intro={intro} />
        <HowItWorks intro={intro} />
        <Features />
        <Pricing />
        <Questions />
        <Bottom />
      </main>
    </div>
  )
}
