/**
 * Khmer / English (Phase 9). Every text the platform itself shows is in
 * src/i18n/messages/*, written as { en, km } pairs side by side. What the
 * seller types (shop, product and category names, descriptions) is shown
 * as typed.
 */
import { messageTree } from './messages/index.ts'

export type Lang = 'km' | 'en'

type Leaf = string | ((...args: never[]) => string)
export type Pair = { en: Leaf; km: Leaf }
/** Checked with `satisfies` on each messages file: a pair missing one
 * language, or holding something else, fails the build. */
export type Tree = { readonly [key: string]: Pair | Tree }

type Resolve<T> = T extends { en: infer E; km: unknown } ? E : { readonly [K in keyof T]: Resolve<T[K]> }
export type Messages = Resolve<typeof messageTree>

function isPair(node: Pair | Tree): node is Pair {
  return 'en' in node && 'km' in node && typeof node.en !== 'object'
}

function pick(node: Tree, lang: Lang): unknown {
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, isPair(child) ? child[lang] : pick(child, lang)]),
  )
}

export const MESSAGES: Record<Lang, Messages> = {
  en: pick(messageTree, 'en') as Messages,
  km: pick(messageTree, 'km') as Messages,
}

const LANG_KEY = 'sc.lang'

/** The device's choice; Khmer until someone picks English (decided
 * 2026-10-02). */
export function storedLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'km'
  } catch {
    return 'km'
  }
}

let current: Lang = storedLang()
document.documentElement.lang = current

/** For code outside components (date formats, API error text). Components
 * use useT(), which also re-renders them when the language changes. */
export function currentLang(): Lang {
  return current
}

export function setCurrentLang(lang: Lang) {
  current = lang
  document.documentElement.lang = lang
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // Private mode etc.: the choice lasts until the page is closed.
  }
}
