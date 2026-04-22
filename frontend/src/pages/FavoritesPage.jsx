import { useEffect, useMemo, useState } from 'react'
import { PageSection } from '../components/common/PageSection'
import { ProductGrid } from '../components/product/ProductGrid'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { groupProductsByBaseName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'

export function FavoritesPage() {
  const language = useShopStore((state) => state.language)
  const favorites = useShopStore((state) => state.favorites)
  const t = translations[language]
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setLoading(true)
      try {
        const response = await storeApi.get('/store/products', {
          signal: controller.signal,
          params: { page: 1, page_size: 100 },
        })
        setProducts(groupProductsByBaseName(response.data.items || []))
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [])

  const items = useMemo(
    () =>
      products.filter((product) => {
        const ids = [product.id, product.product_id, product.detail_id, ...(product.grouped_variants || []).map((variant) => variant.productId)]
        return ids.some((item) => favorites.includes(item))
      }),
    [favorites, products],
  )

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-10 xl:px-14">
      <PageSection title={t.favoritesTitle}>
        {loading ? (
          <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
            Loading products...
          </div>
        ) : items.length ? (
          <ProductGrid products={items} />
        ) : (
          <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
            {t.favoritesEmpty}
          </div>
        )}
      </PageSection>
    </div>
  )
}
