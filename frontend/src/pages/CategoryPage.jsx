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

const sectionCategoryFilters = {
  erkaklar: { gender: 'men' },
  men: { gender: 'men' },
  ayollar: { gender: 'women' },
  women: { gender: 'women' },
  unisex: { gender: 'unisex' },
  kiyimlar: { type: 'clothing' },
  clothing: { type: 'clothing' },
  poyabzal: { type: 'shoe' },
  shoe: { type: 'shoe' },
  shoes: { type: 'shoe' },
  yangi: { only_new: true },
  new: { only_new: true },
}

function getSectionTitle(slug, t) {
  const titles = {
    erkaklar: t.navMen,
    men: t.navMen,
    ayollar: t.navWomen,
    women: t.navWomen,
    unisex: t.navUnisex,
    kiyimlar: t.navClothing,
    clothing: t.navClothing,
    poyabzal: t.navShoes,
    shoe: t.navShoes,
    shoes: t.navShoes,
    yangi: t.navNew,
    new: t.navNew,
  }
  return titles[slug]
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
            type: sectionCategoryFilters[slug]?.type || getCategoryFallback(slug)?.targetType,
            gender: sectionCategoryFilters[slug]?.gender,
            only_new: sectionCategoryFilters[slug]?.only_new,
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
    () => getSectionTitle(slug, t) || category?.[`name_${language}`] || category?.name_uz || category?.name_ru || t.categoryPageTitle,
    [category, language, slug, t],
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
