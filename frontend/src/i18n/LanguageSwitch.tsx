import type { Lang } from './core.ts'
import { useLang, useT } from './useT.ts'

// Each language's own name, never translated.
const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'km', label: 'ខ្មែរ' },
  { lang: 'en', label: 'EN' },
]

/** One button that switches to the other language ("EN" while in Khmer),
 * for the shop's header, where the shop's name needs the room. */
export function LanguageToggle() {
  const { lang, setLang } = useLang()
  const t = useT()
  const other = OPTIONS.find((option) => option.lang !== lang)!
  return (
    <button
      type="button"
      lang={other.lang}
      aria-label={t.common.switchLanguage}
      onClick={() => setLang(other.lang)}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      {other.label}
    </button>
  )
}

/** ខ្មែរ | EN. Remembered on this device. `onDark` for the navy start page. */
export function LanguageSwitch({ className = '', onDark = false }: { className?: string; onDark?: boolean }) {
  const { lang, setLang } = useLang()
  const t = useT()
  const on = onDark ? 'bg-white text-[#182841] shadow-xs' : 'bg-raised text-slate-900 shadow-xs'
  const off = onDark ? 'text-white/75 hover:text-white' : 'text-slate-600 hover:text-slate-900'
  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`inline-flex shrink-0 rounded-xl p-0.5 ${onDark ? 'bg-white/10' : 'bg-slate-100'} ${className}`}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.lang}
          type="button"
          lang={option.lang}
          aria-pressed={lang === option.lang}
          onClick={() => setLang(option.lang)}
          className={`min-h-10 min-w-11 rounded-[10px] px-2.5 text-sm font-semibold transition focus-visible:outline-2 ${
            onDark ? 'focus-visible:outline-white' : 'focus-visible:outline-navy-600'
          } ${lang === option.lang ? on : off}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
