import { PackageOpen } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Skeleton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { CategoryChips, NotFound, ProductGrid, ProductGridSkeleton } from './components.tsx'
import { isNotFound, useShop, useShopCategory } from './queries.ts'

/** /shop/:storeSlug/category/:categorySlug: the category link a seller shares. */
export function ShopCategory() {
  const { storeSlug = '', categorySlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const page = useShopCategory(storeSlug, categorySlug)
  const allProducts = (
    <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
      See all products
    </Link>
  )

  const skeleton = (
    <>
      <Skeleton className="mb-5 h-7 w-40" />
      <ProductGridSkeleton />
    </>
  )

  // A 404 before the shop has loaded may mean the shop is gone, which the
  // layout shows instead.
  if (page.error && !isNotFound(page.error)) {
    return <ErrorState error={page.error} onRetry={() => page.refetch()} />
  }
  if (!shop.data) return skeleton
  if (isNotFound(page.error)) {
    return (
      <>
        <title>{`Category not found · ${shop.data.name}`}</title>
        <NotFound title="This category doesn't exist" action={allProducts}>
          The shop may have renamed or removed it.
        </NotFound>
      </>
    )
  }
  if (!page.data) return skeleton

  const { category, products } = page.data
  return (
    <>
      <title>{`${category.name} · ${shop.data.name}`}</title>
      <h1 className="mb-4 text-2xl font-bold tracking-tight break-words text-slate-900">{category.name}</h1>
      <CategoryChips shop={shop.data} />
      {products.length === 0 ? (
        <EmptyState icon={PackageOpen} title="Nothing here right now" action={allProducts}>
          There are no products in this category at the moment.
        </EmptyState>
      ) : (
        <ProductGrid shop={shop.data} products={products} />
      )}
    </>
  )
}
