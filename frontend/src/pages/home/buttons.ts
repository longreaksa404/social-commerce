const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]'

/** White on night: Create your shop. */
export const solidButton = `${base} bg-white text-night shadow-[0_12px_32px_-12px_rgb(255_255_255/0.45)] hover:bg-white/90`

/** A light outline: Try a demo shop, Log in. */
export const outlineButton = `${base} border border-white/25 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/10`
