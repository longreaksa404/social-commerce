import { Copy, Link2, Plus, Store as StoreIcon, Tags } from 'lucide-react'
import { Link } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { SourceLogo } from '../../components/SourceLogo.tsx'
import { hasLogo } from '../../lib/sourceLogos.ts'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { buttonClass } from '../../components/styles.ts'
import { useT } from '../../i18n/useT.ts'
import { linkPlace, linkTargetName, linkUrl } from '../../lib/links.ts'
import type { ShareLink } from '../../lib/types.ts'
import { useShareShop } from '../ShareShop.tsx'
import { NoPhoto, ProductImage } from '../../shop/components.tsx'
import { useLinks, useProducts, useStore } from '../queries.ts'

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
        <Card className="mb-4 overflow-hidden">
          <ShopLinkRow />
        </Card>
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
      <LinkGroups links={links.data} />
    </>
  )
}

type Group = { key: string; type: ShareLink['target_type']; id: string | null; name: string; links: ShareLink[] }

/** Links grouped by what they open (founder's pick 11A, 2026-10-25): the
 * shop (its own link, then whole-shop links), then each product once with
 * its photo, then each category, each with its places as rows: views,
 * orders and Copy. Most orders first inside each part. */
function LinkGroups({ links }: { links: ShareLink[] }) {
  const t = useT()
  const l = t.links
  const products = useProducts()
  const photo = new Map(products.data?.map((p) => [p.id, p.image_urls[0]]))
  const groups = new Map<string, Group>()
  for (const link of links) {
    const key = link.target_type === 'store' ? 'store' : `${link.target_type}:${link.target_id}`
    const group = groups.get(key) ?? {
      key,
      type: link.target_type,
      id: link.target_id,
      name: linkTargetName(t, link),
      links: [],
    }
    group.links.push(link)
    groups.set(key, group)
  }
  const orders = (g: Group) => g.links.reduce((n, link) => n + link.order_count, 0)
  const byOrders = (a: Group, b: Group) => orders(b) - orders(a)
  for (const g of groups.values()) g.links.sort((a, b) => b.order_count - a.order_count || b.view_count - a.view_count)
  const all = [...groups.values()]
  const shop = groups.get('store')
  const parts = [
    { title: l.products, groups: all.filter((g) => g.type === 'product').sort(byOrders) },
    { title: l.categories, groups: all.filter((g) => g.type === 'category').sort(byOrders) },
  ]

  return (
    <div className="space-y-6">
      <section aria-labelledby="links-shop" className="space-y-2">
        <h2 id="links-shop" className="text-sm font-semibold text-slate-500 sm:px-1">
          {l.yourShop}
        </h2>
        <Card className="divide-y divide-slate-100 overflow-hidden">
          <ShopLinkRow />
          {shop?.links.map((link) => <PlaceRow key={link.id} link={link} />)}
        </Card>
      </section>
      {parts.map(
        (part) =>
          part.groups.length > 0 && (
            <section key={part.title} aria-label={part.title} className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500 sm:px-1">{part.title}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {part.groups.map((group) => (
                  <Card key={group.key} className="divide-y divide-slate-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {group.type === 'product' ? (
                        photo.get(group.id ?? '') ? (
                          <ProductImage small src={photo.get(group.id ?? '')!} alt="" className="size-11 shrink-0 rounded-lg" />
                        ) : (
                          <NoPhoto className="size-11 shrink-0 rounded-lg" iconClassName="size-5" />
                        )
                      ) : (
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Tags aria-hidden className="size-5" />
                        </span>
                      )}
                      <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{group.name}</p>
                      <span className="shrink-0 text-sm text-slate-500 tabular-nums">{l.orders(orders(group))}</span>
                    </div>
                    {group.links.map((link) => (
                      <PlaceRow key={link.id} link={link} />
                    ))}
                  </Card>
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  )
}

/** The shop's plain link, first in Your shop: it was Settings → Shop link
 * until the settings check (founder, 2026-10-19: "we already have Links").
 * Copy as on every link; the header's share button shares it. */
function ShopLinkRow() {
  const store = useStore()
  const { copy } = useShareShop()
  const l = useT().links
  if (!store.data) return null
  const shown = `${window.location.host}/shop/${store.data.slug}`
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
        <StoreIcon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{l.yourShopLink}</p>
        <p className="truncate text-sm text-slate-500">{shown}</p>
      </div>
      <Button variant="secondary" icon={Copy} onClick={copy} className="shrink-0">
        {l.copy}
      </Button>
    </div>
  )
}

/** One link: where it's posted (the place's own logo), its views and
 * orders with how many of the views ordered, and Copy right on it. The
 * row opens the link's page. */
function PlaceRow({ link }: { link: ShareLink }) {
  const { toast } = useFeedback()
  const t = useT()
  const l = t.links
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
    <div className="relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
      {hasLogo(link.source) ? (
        <SourceLogo source={link.source} className="size-8" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Link2 aria-hidden className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link
          to={`/dashboard/links/${link.id}`}
          className="block truncate text-sm font-medium text-slate-900 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          {linkPlace(link) || l.wholeShop}
          {link.path === null && <span className="text-red-700">{l.notWorkingTag}</span>}
        </Link>
        <p className="text-xs text-slate-500 tabular-nums">
          {l.views(link.view_count)} · {l.orders(link.order_count)}
          {pct !== null && ` · ${l.ordered(pct)}`}
        </p>
      </div>
      {link.path && (
        // Above the row's link, so it copies rather than opens.
        <Button variant="secondary" icon={Copy} onClick={copy} className="relative z-10 shrink-0">
          {l.copy}
        </Button>
      )}
    </div>
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
