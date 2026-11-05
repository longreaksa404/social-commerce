import { Bell, CheckCheck, PartyPopper } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Skeleton } from '../components/ui.tsx'
import type { AdminNotice } from '../lib/types.ts'
import { useAdminNotices, useReadNotices } from './queries.ts'
import { ago } from './shared.ts'

// Red and amber on the words only (UI rules); a claim is money waiting, navy.
const TONE: Record<AdminNotice['severity'], string> = {
  action: 'text-navy-700 font-medium',
  urgent: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-slate-500',
}

/** The bell in the admin's header: what needs the admin now (a claim to
 * check, a plan ending, a failed job, no backup…), each opening its page.
 * The notices come from the records; reading one only marks it read. A
 * panel under the bell on a laptop, from the top on a phone. */
export function NoticeBell() {
  const notices = useAdminNotices()
  // Open on the page it was opened on: going to another page closes it.
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (value: boolean | ((was: boolean) => boolean)) =>
    setOpenOn((typeof value === 'function' ? value(open) : value) ? pathname : null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const unread = notices.data?.unread ?? 0

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenOn(null)
        button.current?.focus()
      }
    }
    function onClick(event: MouseEvent) {
      const target = event.target as Node
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpenOn(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((was) => !was)}
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600 lg:size-10 lg:bg-surface lg:ring-1 lg:ring-slate-200 lg:hover:bg-surface lg:hover:ring-slate-300"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white tabular-nums ring-2 ring-surface"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" />
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-label="Notifications"
            tabIndex={-1}
            className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-40 flex max-h-[75dvh] flex-col rounded-b-2xl bg-surface shadow-xl outline-none lg:absolute lg:inset-x-auto lg:top-full lg:right-0 lg:mt-2 lg:max-h-[min(36rem,80dvh)] lg:w-[26rem] lg:rounded-2xl lg:ring-1 lg:ring-slate-200"
          >
            <Panel onPick={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}

function Panel({ onPick }: { onPick: () => void }) {
  const notices = useAdminNotices()
  const read = useReadNotices()
  const items = notices.data?.items ?? []
  const unread = notices.data?.unread ?? 0
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 pr-2 pl-4">
        <h2 className="font-semibold text-slate-900">
          Notifications{unread > 0 && <span className="ml-1.5 text-sm font-normal text-slate-500 tabular-nums">{unread} unread</span>}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => read.mutate(null)}
            disabled={read.isPending}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-navy-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600 disabled:opacity-50"
          >
            <CheckCheck aria-hidden className="size-4" />
            Mark all read
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {notices.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : notices.error ? (
          <p className="p-4 text-sm text-slate-600">
            Couldn't load the notifications.{' '}
            <button type="button" onClick={() => notices.refetch()} className="font-medium text-navy-700 underline">
              Try again
            </button>
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <PartyPopper aria-hidden className="size-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">Nothing needs you</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((notice) => (
              <li key={notice.key}>
                <Link
                  to={notice.href}
                  onClick={() => {
                    if (!notice.read) read.mutate([notice.key])
                    onPick()
                  }}
                  className="flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600"
                >
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${notice.read ? '' : 'bg-navy-700'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${notice.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notice.title}
                      {!notice.read && <span className="sr-only"> (unread)</span>}
                    </span>
                    <span className={`block ${TONE[notice.severity]}`}>{notice.text}</span>
                  </span>
                  {notice.at && <span className="shrink-0 text-xs text-slate-500">{ago(notice.at)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
