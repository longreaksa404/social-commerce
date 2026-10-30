import { useEffect, useState, type ReactNode } from 'react'
import { OakMark } from '../components/OakMark.tsx'
import { exitActing, type Acting } from '../lib/api.ts'

/** Open as seller (founder's picks D1A and 6A, 2026-10-28): a navy bar
 * across the top of the shop's app while the admin uses it, never over the
 * seller's own buttons: whose shop, the time left and Exit. English, like
 * the admin. The layout's sticky bars sit under it (`--acting-bar`). */
export function ActingBar({ acting }: { acting: Acting }) {
  const left = useSecondsLeft(acting.expires_at)
  const over = left <= 0
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex h-9 items-center gap-2 bg-brand px-3 text-sm text-white lg:px-5"
    >
      <OakMark className="h-4 w-auto shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {over ? (
          <>Time's up: Oak Order's 30 minutes in {acting.shop} are over</>
        ) : (
          <>
            In <b className="font-semibold">{acting.shop}</b> as Oak Order
          </>
        )}
      </span>
      {!over && (
        <span className="font-semibold tabular-nums" aria-label={`${Math.ceil(left / 60)} minutes left`}>
          {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
        </span>
      )}
      <button
        type="button"
        onClick={exitActing}
        className="h-7 shrink-0 rounded-lg bg-white px-3 text-xs font-bold text-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Exit
      </button>
    </div>
  )
}

function useSecondsLeft(until: string) {
  const end = Date.parse(until)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(0, Math.round((end - now) / 1000))
}

/** In place of what only the seller may do while the admin has the shop
 * open (D1A): the owner's password, login phone and logins, Close shop
 * and "I've paid" (the API answers NOT_AS_ADMIN to them anyway). */
export function OnlyTheSeller({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200 ring-inset">{children}</p>
}
