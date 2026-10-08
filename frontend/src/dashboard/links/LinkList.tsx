import { Copy, Link2, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { useT } from '../../i18n/useT.ts'
import { linkPlace, linkTargetName, linkUrl, TARGET_ICONS } from '../../lib/links.ts'
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
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.data.map((link) => (
          <li key={link.id}>
            <LinkCard link={link} />
          </li>
        ))}
      </ul>
    </>
  )
}

// Each place's own colour and letter, so links are told apart at a glance.
const SOURCE_MARK: Record<string, { letter: string; className: string }> = {
  facebook: { letter: 'f', className: 'bg-[#1877f2] text-white' },
  tiktok: { letter: 'T', className: 'bg-[#111] text-white ring-1 ring-white/20' },
  instagram: { letter: 'I', className: 'bg-[#d62976] text-white' },
  telegram: { letter: 'T', className: 'bg-[#2a9de0] text-white' },
  messenger: { letter: 'M', className: 'bg-[#0084ff] text-white' },
}

/** A link as a card (founder's pick, 2026-10-08): where it's posted and
 * what it opens, Copy right on it (posting a link is one tap from the
 * list), and its views and orders, with how many of the views ordered.
 * The card opens the link's page. */
function LinkCard({ link }: { link: ShareLink }) {
  const Icon = TARGET_ICONS[link.target_type]
  const { toast } = useFeedback()
  const t = useT()
  const l = t.links
  const mark = link.source ? SOURCE_MARK[link.source] : undefined
  const pct = link.view_count > 0 ? Math.round((link.order_count / link.view_count) * 100) : null

  async function copy() {
    if (!link.path) return
    try {
      await navigator.clipboard.writeText(linkUrl(link.path))
      toast(l.linkCopied)
    } catch {
      toast(l.copyFailed, 'error')
    }
  }

  return (
    <Card className="relative flex h-full flex-col gap-3 p-4 transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        {mark ? (
          <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${mark.className}`}>
            {mark.letter}
          </span>
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/dashboard/links/${link.id}`}
            className="block truncate font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-navy-600"
          >
            {linkTargetName(t, link)}
          </Link>
          <p className="truncate text-sm text-slate-500">
            {linkPlace(link) || l.wholeShop}
            {link.path === null && <span className="text-red-700">{l.notWorkingTag}</span>}
          </p>
        </div>
        {link.path && (
          // Above the card's link, so it copies rather than opens.
          <Button variant="secondary" icon={Copy} onClick={copy} className="relative z-10 shrink-0">
            {l.copy}
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">{l.viewsLabel}</dt>
          <dd className="text-lg font-bold text-slate-900 tabular-nums">{link.view_count}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">{l.ordersLabel}</dt>
          <dd className="text-lg font-bold text-slate-900 tabular-nums">
            {link.order_count}
            {pct !== null && <span className="ml-1.5 text-xs font-medium text-slate-500">{l.ordered(pct)}</span>}
          </dd>
        </div>
      </dl>
    </Card>
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
