import { Link } from 'react-router'
import { OakOrderName } from '../../components/OakMark.tsx'
import { LanguageSwitch } from '../../i18n/LanguageSwitch.tsx'
import { useT } from '../../i18n/useT.ts'
import { outlineButton } from './buttons.ts'

/** The name, the language and Log in stay on an opaque surface. Switching
 * backdrop blur while scrolling made this bar flicker on iPhone Safari
 * (founder's video, 2026-11-07). */
export function TopBar() {
  const t = useT()
  return (
    <header className="home-topbar sticky top-0 z-30 border-b border-slate-200 bg-slate-50 pt-[env(safe-area-inset-top)]">
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
