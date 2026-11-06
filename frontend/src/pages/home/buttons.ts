const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-[0.98]'

/** Navy, the app's own button: Create your shop. */
export const solidButton = `${base} bg-accent text-on-accent shadow-[0_12px_28px_-14px_rgb(31_51_80/0.6)] hover:bg-accent-hover`

/** White with a thin line: Try a demo shop, Log in. */
export const outlineButton = `${base} border border-slate-300 bg-surface text-slate-900 hover:border-slate-400 hover:bg-slate-50`
