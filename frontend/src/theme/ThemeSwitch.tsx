import { useState } from 'react'
import { useT } from '../i18n/useT.ts'
import { setTheme, storedTheme, type ThemeChoice } from './theme.ts'

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
          className={`min-h-10 rounded-[10px] px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            choice === option ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.settings.themeChoice[option]}
        </button>
      ))}
    </div>
  )
}
