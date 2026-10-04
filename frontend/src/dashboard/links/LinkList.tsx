import { ChevronRight, Link2, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { useT } from '../../i18n/useT.ts'
import { linkPlace, linkTargetName, TARGET_ICONS } from '../../lib/links.ts'
import type { ShareLink } from '../../lib/types.ts'
import { useLinks } from '../queries.ts'

/** /dashboard/links: a link per place the seller posts, with the views and
 * orders each brought. */
export function LinkList() {
  const links = useLinks()
  const t = useT()
  const l = t.links

  const newButton = (
    <Link to="/dashboard/links/new" className={`${buttonClass('primary')} shrink-0`}>
      <Plus aria-hidden className="size-4" />
      {l.newLink}
    </Link>
  )

  if (links.isPending) return <ListSkeleton />
  if (links.error) {
    return (
      <>
        <PageHeader title={l.title} />
        <ErrorState error={links.error} onRetry={() => links.refetch()} />
      </>
    )
  }
  if (links.data.length === 0) {
    return (
      <>
        <PageHeader title={l.title} />
        <EmptyState
          icon={Link2}
          title={l.emptyTitle}
          action={
            <Link to="/dashboard/links/new" className={buttonClass('primary', 'lg')}>
              <Plus aria-hidden className="size-5" />
              {l.newLink}
            </Link>
          }
        >
          {l.emptyText}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title={l.title} action={newButton} />
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {links.data.map((link) => (
          <LinkRow key={link.id} link={link} />
        ))}
      </Card>
    </>
  )
}

function LinkRow({ link }: { link: ShareLink }) {
  const Icon = TARGET_ICONS[link.target_type]
  const t = useT()
  return (
    <Link
      to={`/dashboard/links/${link.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{linkTargetName(t, link)}</span>
        <span className="mt-0.5 block truncate text-sm text-slate-700">{linkPlace(link)}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {t.links.views(link.view_count)} · {t.links.orders(link.order_count)}
          {link.path === null && t.links.notWorkingTag}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

function ListSkeleton() {
  const l = useT().links
  return (
    <>
      <PageHeader title={l.title} />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 sm:p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}
