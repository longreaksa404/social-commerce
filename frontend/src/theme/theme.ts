/**
 * Light / dark (Phase 9): follows the phone's setting unless this device
 * chose Light or Dark. index.html applies it before the first paint (same
 * key and rule as here); this keeps it current afterwards. The colors
 * themselves are in index.css.
 */
export type ThemeChoice = 'auto' | 'light' | 'dark'

const THEME_KEY = 'sc.theme'
// The bars' color, for the phone's status bar.
const BAR_COLORS = { light: '#ffffff', dark: '#0f172a' }
const phoneDark = window.matchMedia('(prefers-color-scheme: dark)')

export function storedTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

function apply(choice: ThemeChoice) {
  const theme = choice === 'dark' || (choice === 'auto' && phoneDark.matches) ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme])
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, choice)
  } catch {
    // Private mode etc.: the choice lasts until the page is closed.
  }
  apply(choice)
}

/** Follow the phone switching between light and dark while the app is open. */
export function initTheme() {
  apply(storedTheme())
  phoneDark.addEventListener('change', () => apply(storedTheme()))
}
