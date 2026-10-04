import { createContext, use } from 'react'
import type { Lang, Messages } from './core.ts'

type LanguageState = { lang: Lang; setLang: (lang: Lang) => void; t: Messages }

export const LanguageContext = createContext<LanguageState | null>(null)

function useLanguageState(): LanguageState {
  const value = use(LanguageContext)
  if (!value) throw new Error('useT must be used inside LanguageProvider')
  return value
}

/** The texts in the chosen language: t.cart.title, t.cart.items(3). */
export function useT(): Messages {
  return useLanguageState().t
}

export function useLang(): { lang: Lang; setLang: (lang: Lang) => void } {
  const { lang, setLang } = useLanguageState()
  return { lang, setLang }
}
