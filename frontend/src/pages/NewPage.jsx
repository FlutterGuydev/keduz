import { useEffect, useMemo, useState } from 'react'
import { ProductGrid } from '../components/product/ProductGrid'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { groupProductsByBaseName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'

export function NewPage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setLoading(true)
      try {
        const response = await storeApi.get('/store/products', {
          signal: controller.signal,
          params: { page: 1, page_size: 60, only_new: true, sort: 'newest' },
        })
        setItems(groupProductsByBaseName(response.data.items || []))
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [])

  const visibleItems = useMemo(() => items, [items])

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-10 xl:px-14">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-4xl font-extrabold text-black sm:text-5xl">
          {t.newArrivalsTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">{t.newPageSubtitle}</p>
      </div>
      {loading ? (
        <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
          Loading products...
        </div>
      ) : visibleItems.length ? (
        <ProductGrid products={visibleItems} />
      ) : (
        <div className="rounded-[28px] border border-black/6 bg-white p-10 text-center text-zinc-500">
          {t.emptyState}
        </div>
      )}
    </div>
  )
}
