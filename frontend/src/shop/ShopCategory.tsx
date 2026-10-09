import { PackageOpen } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { NotFound, ProductGrid, ProductGridSkeleton } from './components.tsx'
import { ShopIntro, ShopIntroSkeleton } from './ShopHome.tsx'
import { isNotFound, useShop, useShopCategory } from './queries.ts'

/** /shop/:storeSlug/category/:categorySlug: the category link a seller shares. */
export function ShopCategory() {
  const { storeSlug = '', categorySlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const page = useShopCategory(storeSlug, categorySlug)
  const t = useT()
  const allProducts = (
    <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
      {t.shop.seeAllProducts}
    </Link>
  )

  const skeleton = shop.data ? (
    <>
      <ShopIntro shop={shop.data} />
      <ProductGridSkeleton />
    </>
  ) : (
    <ShopIntroSkeleton />
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
        <title>{t.shop.category.notFoundTab(shop.data.name)}</title>
        <NotFound title={t.shop.category.notFoundTitle} action={allProducts}>
          {t.shop.category.notFoundText}
        </NotFound>
      </>
    )
  }
  if (!page.data) return skeleton

  const { category, products } = page.data
  return (
    <>
      <title>{`${category.name} · ${shop.data.name}`}</title>
      {/* The same top as All: the chosen tab says which category this is. */}
      <ShopIntro shop={shop.data} />
      {products.length === 0 ? (
        <EmptyState icon={PackageOpen} title={t.shop.category.emptyTitle} action={allProducts}>
          {t.shop.category.emptyText}
        </EmptyState>
      ) : (
        <ProductGrid shop={shop.data} products={products} category={category.slug} />
      )}
    </>
  )
}
