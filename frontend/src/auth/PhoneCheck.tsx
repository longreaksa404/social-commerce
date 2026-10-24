import { AlertCircle, CircleCheck, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { formatPhone } from '../lib/orders.ts'
import type { PhoneCheck as Check } from '../lib/types.ts'
import { usePhoneCheck } from './usePhoneCheck.ts'

/**
 * A phone number proved through the Telegram bot (founder's choice
 * 2026-10-09): the seller opens the bot, taps "Share my phone number",
 * and comes back to find it verified. `onChange` gets the finished check
 * (its id goes in with the form), or null when they start over.
 *
 * `taken`: what to say when the number already has an account, in amber
 * words in the box, with an `action` (e.g. Log in) beside "Use another
 * number" (founder's pick 5A, 2026-10-18); without it, such a number is
 * passed on like any other.
 *
 * `required`: a red * on the label, like a required Field.
 *
 * `resume`: a check opened before the page reloaded (the sign-up draft),
 * read again instead of making a new one; `onOpen` hands the check out
 * when the seller opens Telegram, so the page can keep it.
 */
export function PhoneCheck({
  label,
  error,
  onChange,
  taken,
  resume = null,
  onOpen,
  required = false,
}: {
  label: string
  error?: string | null
  onChange: (check: Check | null) => void
  taken?: { message: ReactNode; action?: ReactNode }
  resume?: Check | null
  onOpen?: (check: Check) => void
  required?: boolean
}) {
  const { check, created, read, done, opened, setOpened, startOver: restart, expired } = usePhoneCheck(resume)
  const t = useT()
  const p = t.auth.phoneCheck

  useEffect(() => {
    if (done) onChange(done)
  }, [done, onChange])

  function startOver() {
    restart()
    onChange(null)
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </p>
      {done && done.taken && taken ? (
        <div className="space-y-3 rounded-xl border border-slate-300 px-4 py-3">
          <p>
            <span className="block font-semibold text-slate-900 tabular-nums">{formatPhone(done.phone ?? '')}</span>
            <span className="block text-sm font-medium text-amber-700">{taken.message}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {taken.action}
            <button type="button" onClick={startOver} className="min-h-11 text-sm font-medium text-navy-700 link">
              {p.another}
            </button>
          </div>
        </div>
      ) : done ? (
        // A plain box like the fields, the tick and words in green (founder's
        // pick 7A, 2026-10-18: colour on the words, not the box).
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-slate-300 px-4 py-3">
            <span className="flex items-center gap-2">
              <CircleCheck aria-hidden className="size-5 text-emerald-600" />
              <span>
                <span className="block font-semibold text-slate-900 tabular-nums">{formatPhone(done.phone ?? '')}</span>
                <span className="block text-xs font-medium text-emerald-700">{p.verified}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={startOver}
              className="min-h-11 text-sm font-medium text-navy-700 link"
            >
              {p.another}
            </button>
          </div>
        </div>
      ) : created.error ? (
        <div className="space-y-3">
          <ErrorMessage error={created.error} />
          <Button
            variant="secondary"
            icon={RotateCcw}
            loading={created.isFetching}
            onClick={() => created.refetch()}
            className="w-full"
          >
            {t.common.tryAgain}
          </Button>
        </div>
      ) : expired ? (
        <div className="space-y-3">
          <ErrorMessage error={read.error} />
          <Button variant="secondary" icon={RotateCcw} onClick={startOver} className="w-full">
            {p.again}
          </Button>
        </div>
      ) : (
        <div>
          <a
            href={check?.telegram_url}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!check}
            onClick={() => {
              setOpened(true)
              if (check) onOpen?.(check)
            }}
            className={`${buttonClass(opened ? 'secondary' : 'primary')} w-full ${check ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Send aria-hidden className="size-4" />
            {p.verify}
          </a>
          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500" aria-live="polite">
            {opened && <LoaderCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 animate-spin" />}
            {opened ? p.waiting : p.hint}
          </p>
        </div>
      )}
      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-sm text-red-600">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
