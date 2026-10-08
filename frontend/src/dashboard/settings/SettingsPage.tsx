import { useParams } from 'react-router'
import { useSyncExternalStore } from 'react'
import { useRole } from '../queries.ts'
import { isPageId, isSectionId } from './form.ts'
import { SettingsMenu } from './SettingsMenu.tsx'
import { SettingsSection } from './SettingsSection.tsx'

// Tailwind's lg: the laptop layout.
const WIDE = window.matchMedia('(min-width: 1024px)')
const onWideChange = (notify: () => void) => {
  WIDE.addEventListener('change', notify)
  return () => WIDE.removeEventListener('change', notify)
}

/** /dashboard/settings and /dashboard/settings/:section. Phones show the
 * menu or one setting; laptops keep the menu beside the open setting, so
 * moving from payment to delivery needs no going back (founder's pick,
 * 2026-10-08). With none chosen, a laptop opens the shop's own. */
export function SettingsPage() {
  const { section } = useParams()
  const wide = useSyncExternalStore(onWideChange, () => WIDE.matches)
  const role = useRole()
  // Staff have only their account here (founder's choice 2026-10-08).
  const first = role === 'staff' ? 'account' : 'shop'
  const open = isSectionId(section) || isPageId(section) ? section : wide && role ? first : undefined
  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className={section ? 'max-lg:hidden' : ''}>
        <SettingsMenu selected={open} />
      </div>
      {/* On laptops, once the role says which page opens first. */}
      {(section || (wide && open)) && (
        <div className={section ? '' : 'max-lg:hidden'}>
          <SettingsSection key={open} open={section ?? open} />
        </div>
      )}
    </div>
  )
}
