import { Moon, Sun } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { useT } from '../i18n/useT.ts'
import { currentTheme, onThemeChange, setTheme, storedTheme, toggleTheme, type ThemeChoice } from './theme.ts'

const CHOICES: ThemeChoice[] = ['auto', 'light', 'dark']

/** Auto (the phone's setting) | Light | Dark. Remembered on this device. */
export function ThemeSwitch() {
  const [choice, setChoice] = useState(storedTheme)
  const t = useT()
  return (
    <div role="group" aria-label={t.settings.theme} className="inline-flex shrink-0 rounded-xl bg-slate-100 p-0.5">
      {CHOICES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={choice === option}
          onClick={() => {
            setTheme(option)
            setChoice(option)
          }}
          className={`min-h-10 rounded-[10px] px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-navy-600 ${
            choice === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.settings.themeChoice[option]}
        </button>
      ))}
    </div>
  )
}

/** One button that switches light / dark (a moon while light), for the
 * shop's header beside the language button; `withLabel` adds what it does
 * in words. Remembered on this device. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const theme = useSyncExternalStore(onThemeChange, currentTheme)
  const t = useT()
  const Icon = theme === 'dark' ? Sun : Moon
  const label = theme === 'dark' ? t.common.switchToLight : t.common.switchToDark
  return (
    <button
      type="button"
      aria-label={withLabel ? undefined : label}
      title={withLabel ? undefined : label}
      onClick={toggleTheme}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600 ${
        withLabel ? 'px-3 text-sm font-medium' : 'size-11'
      }`}
    >
      <Icon aria-hidden className="size-5" />
      {withLabel && label}
    </button>
  )
}
