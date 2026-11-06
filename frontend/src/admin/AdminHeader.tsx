import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { NoticeBell } from './Notices.tsx'
import { SearchBox } from './Search.tsx'

/** Every admin page's title row (founder's pick 1A, 2026-11-06): the
 * title, the page's own buttons, then the search and the bell at the right
 * on a laptop, so they don't take a row of their own; on a phone they are
 * in the top bar. Titles wrap instead of being cut. `phone={false}`: not
 * on phones, where a shop or a person opens as its own page with its own
 * bar. `back`: an arrow before the title. */
export function AdminPageHeader({
  title,
  subtitle,
  action,
  back,
  phone = true,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  back?: string
  phone?: boolean
}) {
  return (
    <div className={`mb-4 flex-wrap items-center gap-x-3 gap-y-2 lg:mb-5 ${phone ? 'flex' : 'hidden lg:flex'}`}>
      {back && (
        <Link
          to={back}
          aria-label="Back"
          className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1 basis-48">
        <h1 className="text-xl font-bold tracking-tight break-words text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 tabular-nums">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      <div className="hidden items-center gap-2 lg:flex">
        <SearchBox wide />
        <NoticeBell />
      </div>
    </div>
  )
}
