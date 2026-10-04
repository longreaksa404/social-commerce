// Effects for the moments worth marking: something added to the cart, an
// order placed, an order completed. Plain DOM and CSS (keyframes in
// index.css), skipped when the phone asks for reduced motion.

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A short vibration where the phone allows it: Android does; iPhones
 * don't let web pages vibrate. */
export function buzz(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Not allowed here (some in-app browsers).
  }
}

const COLORS = ['#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#facc15']
const PIECES = 28

/** A burst of confetti from a point on the screen. It floats above the
 * page without moving anything, and removes itself. */
export function confetti(x: number, y: number) {
  if (reducedMotion()) return
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:60;pointer-events:none`
  for (let i = 0; i < PIECES; i++) {
    const angle = (i / PIECES) * Math.PI * 2 + Math.random() * 0.4
    const distance = 60 + Math.random() * 90
    const size = 5 + Math.random() * 4
    const piece = document.createElement('span')
    piece.style.cssText = [
      'position:absolute',
      `left:${-size / 2}px`,
      `top:${-size / 2}px`,
      `width:${size}px`,
      `height:${Math.random() < 0.5 ? size : size * 1.6}px`,
      `background:${COLORS[i % COLORS.length]}`,
      `border-radius:${Math.random() < 0.3 ? '50%' : '2px'}`,
      // Where it flies to before falling (index.css @keyframes confetti).
      `--x:${Math.round(Math.cos(angle) * distance)}px`,
      `--y:${Math.round(Math.sin(angle) * distance * 0.8 - 30)}px`,
      `--r:${Math.round((Math.random() - 0.5) * 720)}deg`,
      `animation:confetti ${900 + Math.round(Math.random() * 400)}ms linear forwards`,
    ].join(';')
    layer.append(piece)
  }
  document.body.append(layer)
  setTimeout(() => layer.remove(), 1500)
}

/** Confetti from the middle of an element. */
export function confettiFrom(element: Element | null | undefined) {
  if (!element) return
  const box = element.getBoundingClientRect()
  confetti(box.left + box.width / 2, box.top + box.height / 2)
}
