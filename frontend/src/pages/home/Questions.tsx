import { Plus } from 'lucide-react'
import { useT } from '../../i18n/useT.ts'
import { usePlanPrices } from '../../lib/planPrices.ts'

/** Five questions that open on tap: plain <details>, no script. */
export function Questions() {
  const t = useT()
  const prices = usePlanPrices()
  const q = t.home.questions
  const items: [string, string][] = [
    [q.app.q, q.app.a],
    [q.computer.q, q.computer.a],
    [q.pay.q, q.pay.a],
    [q.after.q(prices.trial), q.after.a(prices.month, prices.year)],
    [q.chat.q, q.chat.a],
  ]
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <h2 data-reveal="wipe" className="home-display text-[clamp(1.85rem,6vw,3.25rem)]">
          {q.title}
        </h2>
        <div data-reveal className="mt-10 space-y-3">
          {items.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl bg-surface shadow-card ring-1 ring-slate-900/6">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium focus-visible:outline-2 focus-visible:outline-navy-600">
                {question}
                <Plus aria-hidden className="size-5 shrink-0 text-champagne transition duration-300 group-open:rotate-45" />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
