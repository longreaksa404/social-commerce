import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { OakOrderName } from '../../components/OakMark.tsx'
import { LanguageSwitch } from '../../i18n/LanguageSwitch.tsx'
import { useT } from '../../i18n/useT.ts'
import { outlineButton } from './buttons.ts'

/** The name, the language and Log in. It stays at the top, and turns into a
 * frosted strip once the page has scrolled (blur only here: on many cards
 * it's slow on cheap phones). */
export function TopBar() {
  const t = useT()
  const scrolled = useScrolled(40)
  return (
    <header
      className={`home-topbar sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-colors duration-500 ${
        scrolled ? 'border-slate-200 bg-slate-50/80 backdrop-blur-md' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center text-xl text-oak-ink sm:text-2xl">
          <OakOrderName />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link data-cta="login" to="/login" className={`${outlineButton} px-4 text-sm`}>
            {t.auth.logIn}
          </Link>
        </div>
      </div>
    </header>
  )
}

function useScrolled(past: number): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > past)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > past)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [past])
  return scrolled
}
