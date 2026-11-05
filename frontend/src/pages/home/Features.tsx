import { FileSpreadsheet, MessageCircle, Package, Receipt, Truck, Users, type LucideIcon } from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'
import { reducedMotion } from '../../components/effects.ts'
import { useT } from '../../i18n/useT.ts'

const FEATURES: [key: 'chat' | 'stock' | 'driver' | 'receipt' | 'customers' | 'excel', icon: LucideIcon][] = [
  ['chat', MessageCircle],
  ['stock', Package],
  ['driver', Truck],
  ['receipt', Receipt],
  ['customers', Users],
  ['excel', FileSpreadsheet],
]

/** Also in Oak Order: six frosted tiles, icons and words only. */
export function Features() {
  const t = useT()
  const features = t.home.features
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 data-reveal="wipe" className="home-display max-w-2xl text-[clamp(1.85rem,6vw,3.25rem)]">
          {features.title}
        </h2>
        {/* One column on narrow phones: Khmer in half a 360px screen runs 6+ lines. */}
        <ul className="mt-12 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([key, Icon], index) => (
            <li key={key} data-reveal style={{ '--i': index } as CSSProperties}>
              <div
                onPointerMove={tilt}
                onPointerLeave={settle}
                onPointerUp={settle}
                onPointerCancel={settle}
                className="home-tilt flex h-full gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)] min-[480px]:flex-col"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-champagne/30 text-champagne">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{features[key].title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">{features[key].text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Lean the tile up to 6° toward a mouse, or a finger pressing it. */
function tilt(event: PointerEvent<HTMLElement>) {
  if (reducedMotion() || (event.pointerType !== 'mouse' && event.buttons === 0)) return
  const box = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - box.left) / box.width - 0.5
  const y = (event.clientY - box.top) / box.height - 0.5
  event.currentTarget.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`)
  event.currentTarget.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`)
}

function settle(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--rx', '0deg')
  event.currentTarget.style.setProperty('--ry', '0deg')
}
