import { Check, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { OpenShopButton } from '../OpenShop.tsx'
import { useStore } from '../queries.ts'
import { ESSENTIAL, hideSetup, STEP_TARGETS, useSetup, type Setup, type SetupStep } from './setup.ts'

/** /dashboard/settings/setup: the steps to get the shop ready (founder's
 * pick 7C), each opening its own page; ticked once done. */
export function SetupPage() {
  const setup = useSetup()
  const store = useStore()
  const navigate = useNavigate()
  const s = useT().settings.setup
  if (!setup) return null
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{s.hint}</p>
      <Card>
        <SetupSteps setup={setup} />
      </Card>
      {store.data && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              hideSetup(store.data.id)
              navigate('/dashboard/settings', { replace: true })
            }}
          >
            {s.hide}
          </Button>
        </div>
      )}
    </div>
  )
}

/** The same steps at the top of Orders while the shop isn't ready (UX
 * check #3, 2026-10-17): a new seller's first screen says what to do next,
 * in order, with the next step's button in its row. */
export function SetupCard({ setup }: { setup: Setup }) {
  const s = useT().settings.setup
  const total = setup.steps.length
  const next =
    setup.steps.find((x) => !x.done && ESSENTIAL.has(x.step))?.step ?? setup.steps.find((x) => !x.done)?.step
  return (
    <Card className="mb-4">
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{s.readyTitle}</h2>
          <span className="shrink-0 text-sm text-slate-500 tabular-nums">{s.progress(setup.done, total)}</span>
        </div>
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-brand" style={{ width: `${(setup.done / total) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{s.readyHint}</p>
      </div>
      <SetupSteps setup={setup} next={next} />
    </Card>
  )
}

const ROW =
  'flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl'

/** A row per step, each opening its page. `next` gets its button in the
 * row instead (Open shop asks first, as everywhere). */
function SetupSteps({ setup, next }: { setup: Setup; next?: SetupStep }) {
  const s = useT().settings.setup
  return (
    <ul className="divide-y divide-slate-100">
      {setup.steps.map(({ step, done }) => {
        const body = (
          <>
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
              }`}
            >
              {done && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block ${done ? 'font-medium text-slate-500 line-through' : step === next ? 'font-semibold text-slate-900' : 'font-medium text-slate-900'}`}
              >
                {s.steps[step]}
              </span>
              <span className="sr-only">{done ? s.doneLabel : s.todoLabel}</span>
              {!ESSENTIAL.has(step) && !done && <span className="text-sm text-slate-500">{s.optional}</span>}
            </span>
          </>
        )
        return (
          <li key={step}>
            {step === next ? (
              <div className={ROW}>
                {body}
                {step === 'open' ? (
                  <OpenShopButton />
                ) : (
                  <Link to={STEP_TARGETS[step]} className={`${buttonClass('primary')} shrink-0`}>
                    {s.action[step]}
                  </Link>
                )}
              </div>
            ) : (
              <Link
                to={STEP_TARGETS[step]}
                className={`${ROW} transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
              >
                {body}
                <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
