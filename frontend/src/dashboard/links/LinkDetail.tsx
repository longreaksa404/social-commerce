import { Check, Copy, ExternalLink, Share2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { countLabel, linkPlace, linkTargetName, linkUrl, TARGET_ICONS } from '../../lib/links.ts'
import { formatDate } from '../../lib/orders.ts'
import type { LinkStats } from '../../lib/types.ts'
import { OrderRow } from '../orders/OrderRow.tsx'
import { useLinkStats } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'

/** /dashboard/links/:linkId: the address to share, and what it brought. */
export function LinkDetail() {
  const { linkId = '' } = useParams()
  const link = useLinkStats(linkId)
  const back = useBackTo('/dashboard/links')

  if (link.isPending) return <DetailSkeleton back={back} />
  if (link.error) {
    return (
      <>
        <PageHeader title="Link" back={back} />
        <ErrorState error={link.error} onRetry={() => link.refetch()} />
      </>
    )
  }
  return <LinkView link={link.data} back={back} />
}

function LinkView({ link, back }: { link: LinkStats; back: string }) {
  const Icon = TARGET_ICONS[link.target_type]
  const title = linkTargetName(link)
  return (
    <>
      <PageHeader title={title} back={back} />
      <title>{title}</title>

      <div className="space-y-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold break-words text-slate-900">{linkPlace(link)}</p>
              <p className="text-sm text-slate-500">Made {formatDate(link.created_at)}</p>
            </div>
          </div>

          {link.path ? <ShareBox url={linkUrl(link.path)} title={title} /> : <NotWorking link={link} />}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <dt className="text-sm text-slate-500">Views</dt>
              <dd className="text-lg font-bold text-slate-900">{link.view_count}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Orders</dt>
              <dd className="text-lg font-bold text-slate-900">{link.order_count}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A view counts once per phone every 30 minutes. An order counts if it's placed on the same phone within 7 days
            of opening this link.
          </p>
        </Card>

        <section aria-labelledby="link-orders">
          <h2 id="link-orders" className="mb-2 px-1 font-semibold text-slate-900">
            Orders
          </h2>
          {link.orders.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500 sm:p-6">No orders from this link yet.</Card>
          ) : (
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {link.orders.map((order) => (
                <OrderRow key={order.id} order={order} back={`/dashboard/links/${link.id}`} />
              ))}
            </Card>
          )}
          {link.order_count > link.orders.length && (
            <p className="mt-2 px-1 text-sm text-slate-500">
              The latest {link.orders.length} of {countLabel(link.order_count, 'order', 'orders')}.
            </p>
          )}
        </section>
      </div>
    </>
  )
}

/** The address, with Copy, and Share (the phone's share sheet) where the
 * browser has one. */
function ShareBox({ url, title }: { url: string; title: string }) {
  const { toast } = useFeedback()
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast("Couldn't copy. Press and hold the link to copy it.", 'error')
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url })
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-sm break-all text-slate-700 select-all">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button icon={copied ? Check : Copy} onClick={copy} className="flex-1 sm:flex-none">
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {canShare && (
          <Button variant="secondary" icon={Share2} onClick={share} className="flex-1 sm:flex-none">
            Share
          </Button>
        )}
        {/* Without the token, so the seller's own look isn't a view. */}
        <a href={url.split('?')[0]} target="_blank" rel="noopener" className={`${buttonClass('ghost')} flex-1 sm:flex-none`}>
          <ExternalLink aria-hidden className="size-4" />
          Open
        </a>
      </div>
    </div>
  )
}

function NotWorking({ link }: { link: LinkStats }) {
  const message =
    link.target_type === 'category'
      ? 'This category was deleted, so the link shows “not found”.'
      : 'This product is hidden from your shop, so the link shows “not found”. Show the product again and the link works again.'
  return (
    <p className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  return (
    <>
      <PageHeader title="Link" back={back} />
      <Card className="space-y-3 p-4 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </Card>
    </>
  )
}
