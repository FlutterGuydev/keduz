import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { catalogCategories, homeCategories } from '../data/catalogData'
import { PageSection } from '../components/common/PageSection'
import { ProductGrid } from '../components/product/ProductGrid'
import { useShopStore } from '../store/useShopStore'
import { translations } from '../i18n/translations'
import { groupProductsByBaseName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'

function getCategoryFallback(slug) {
  return homeCategories.find((item) => item.slug === slug) || catalogCategories.find((item) => item.slug === slug)
}

export function CategoryPage() {
  const { slug } = useParams()
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const [category, setCategory] = useState(getCategoryFallback(slug))
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategoryProducts() {
      setLoading(true)
      try {
        const categoriesResponse = await storeApi.get('/store/products/categories', {
          signal: controller.signal,
        })
        const backendCategory = categoriesResponse.data.find((item) => item.slug === slug)
        setCategory(backendCategory || getCategoryFallback(slug))

        const response = await storeApi.get('/store/products', {
          signal: controller.signal,
          params: {
            page: 1,
            page_size: 60,
            category_id: backendCategory?.id,
            type: getCategoryFallback(slug)?.targetType,
            sort: 'newest',
          },
        })
        setProducts(groupProductsByBaseName(response.data.items || []))
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadCategoryProducts()
    return () => controller.abort()
  }, [slug])

  const title = useMemo(
    () => category?.[`name_${language}`] || category?.name_uz || category?.name_ru || t.categoryPageTitle,
    [category, language, t.categoryPageTitle],
  )
  const description = category?.[`subtitle_${language}`] || ''

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-10 xl:px-14">
      <PageSection eyebrow={t.categoryPageTitle} title={title} description={description}>
        {loading ? (
          <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
            Loading products...
          </div>
        ) : products.length ? (
          <ProductGrid products={products} />
        ) : (
          <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
            {t.emptyState}
          </div>
        )}
      </PageSection>
    </div>
  )
}
