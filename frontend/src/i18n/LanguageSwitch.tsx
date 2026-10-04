import type { Lang } from './core.ts'
import { useLang, useT } from './useT.ts'

// Each language's own name, never translated.
const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'km', label: 'ខ្មែរ' },
  { lang: 'en', label: 'EN' },
]

/** ខ្មែរ | EN. Remembered on this device. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  const t = useT()
  return (
    <div role="group" aria-label={t.common.language} className={`inline-flex shrink-0 rounded-xl bg-slate-100 p-0.5 ${className}`}>
      {OPTIONS.map((option) => (
        <button
          key={option.lang}
          type="button"
          lang={option.lang}
          aria-pressed={lang === option.lang}
          onClick={() => setLang(option.lang)}
          className={`min-h-10 min-w-11 rounded-[10px] px-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            lang === option.lang ? 'bg-raised text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
