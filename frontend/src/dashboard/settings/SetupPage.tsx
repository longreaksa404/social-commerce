import { Check, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button, Card } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { useStore } from '../queries.ts'
import { ESSENTIAL, hideSetup, STEP_TARGETS, useSetup } from './setup.ts'

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
        <ul className="divide-y divide-slate-100">
          {setup.steps.map(({ step, done }) => (
            <li key={step}>
              <Link
                to={STEP_TARGETS[step]}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl"
              >
                <span
                  aria-hidden
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
                  }`}
                >
                  {done && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {s.steps[step]}
                  </span>
                  <span className="sr-only">{done ? s.doneLabel : s.todoLabel}</span>
                  {!ESSENTIAL.has(step) && !done && <span className="text-sm text-slate-500">{s.optional}</span>}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
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
