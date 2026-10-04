/** danger: outlined red (secondary destructive); destructive: solid red. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const buttonBase =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
  secondary: 'border border-slate-300 bg-surface text-slate-800 shadow-xs hover:bg-slate-50',
  danger: 'border border-red-200 bg-surface text-red-600 shadow-xs hover:bg-red-50',
  destructive: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const buttonSizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm sm:min-h-10',
  lg: 'min-h-12 px-5 text-base',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`
}

/** A card's look (Card, and lists drawn as cards). On phones it runs to
 * the screen's edges, out of the page's 16px padding, square, with a line
 * above and below (founder's choice 2026-10-04, like a phone app); from
 * `sm` up a rounded card. Only for boxes sitting straight in the page. */
export const cardClass = '-mx-4 bg-surface shadow-card ring-1 ring-slate-900/6 sm:mx-0 sm:rounded-2xl'
