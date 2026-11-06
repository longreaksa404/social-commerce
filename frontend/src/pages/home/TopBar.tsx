import { Link } from 'react-router'
import { OakOrderName } from '../../components/OakMark.tsx'
import { LanguageSwitch } from '../../i18n/LanguageSwitch.tsx'
import { useT } from '../../i18n/useT.ts'
import { outlineButton } from './buttons.ts'

/** Keep the bar outside the main content's clipping, on its own fixed
 * composited layer: an opaque sticky bar still flickered while scrolling
 * on the founder's iPhone (2026-11-07). Home reserves its height. */
export function TopBar() {
  const t = useT()
  return (
    <header className="home-topbar fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-slate-50 pt-[env(safe-area-inset-top)] [backface-visibility:hidden] [transform:translateZ(0)]">
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
