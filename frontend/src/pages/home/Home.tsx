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

/** The start page, for sellers who've never heard of Oak Order (founder's
 * picks 2026-11-04, docs/superpowers/specs/2026-11-04-home-page-design.md):
 * what it does, How it works on a phone, the price, questions, a demo shop
 * to try. Logged-in sellers go straight to their dashboard. */
export function Home() {
  const { status } = useAuth()
  if (status === 'loading') return <Spinner />
  // 'unreachable' has a stored session: the dashboard shows the retry.
  if (status === 'authenticated' || status === 'unreachable') return <Navigate to="/dashboard" replace />
  return (
    <div className="home relative isolate min-h-dvh overflow-x-clip text-white">
      <TopBar />
      <main data-home>
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
