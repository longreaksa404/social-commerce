/** danger: outlined red (secondary destructive); destructive: solid red. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const buttonBase =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
  secondary: 'border border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-slate-50',
  danger: 'border border-red-200 bg-white text-red-600 shadow-xs hover:bg-red-50',
  destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const buttonSizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm sm:min-h-10',
  lg: 'min-h-12 px-5 text-base',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`
}
