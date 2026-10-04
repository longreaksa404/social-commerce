import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { currentLang, MESSAGES, setCurrentLang, type Lang } from './core.ts'
import { LanguageContext } from './useT.ts'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang)

  const setLang = useCallback((next: Lang) => {
    setCurrentLang(next)
    setLangState(next)
  }, [])

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang] }), [lang, setLang])
  return <LanguageContext value={value}>{children}</LanguageContext>
}
