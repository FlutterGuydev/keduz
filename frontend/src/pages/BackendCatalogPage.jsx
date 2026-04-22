import { useEffect, useMemo, useState } from 'react'
import { FiFilter } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/catalog/Breadcrumbs'
import { EmptyState } from '../components/catalog/EmptyState'
import { SortDropdown } from '../components/catalog/SortDropdown'
import { ProductGrid } from '../components/product/ProductGrid'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { groupProductsByBaseName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'

const sortOptions = (t) => [
  { value: 'newest', label: t.sortNewest },
  { value: 'price_asc', label: t.sortPriceAsc },
  { value: 'price_desc', label: t.sortPriceDesc },
  { value: 'popular', label: t.sortDiscount },
]

function hasValidPrice(value) {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
}

function getActiveFilterCount(filters) {
  return [
    filters.gender !== 'all',
    filters.type !== 'all',
    filters.category !== 'all',
    hasValidPrice(filters.minPrice),
    hasValidPrice(filters.maxPrice),
    filters.onlyNew,
    filters.onlyInStock,
  ].filter(Boolean).length
}

export function BackendCatalogPage() {
  const language = useShopStore((state) => state.language)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const t = translations[language]
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: 20, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState([])

  const filters = {
    gender: searchParams.get('gender') || 'all',
    type: searchParams.get('type') || 'all',
    category: searchParams.get('category') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    onlyNew: searchParams.get('new') === 'true',
    onlyInStock: searchParams.get('stock') === 'true',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page') || 1),
  }

  const groupedProducts = useMemo(() => groupProductsByBaseName(products), [products])
  const activeFilterCount = getActiveFilterCount(filters)
  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      try {
        const response = await storeApi.get('/store/products/categories', {
          signal: controller.signal,
        })
        setCategoryOptions(response.data)
      } catch {
        setCategoryOptions([])
      }
    }

    loadCategories()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setLoading(true)
      setError('')
      try {
        const selectedCategory = categoryOptions.find((item) => item.slug === filters.category)
        const response = await storeApi.get('/store/products', {
          signal: controller.signal,
          params: {
            page: filters.page,
            page_size: 20,
            search: searchQuery || undefined,
            category_id: selectedCategory?.id,
            gender: filters.gender === 'all' ? undefined : filters.gender,
            type: filters.type === 'all' ? undefined : filters.type,
            only_new: filters.onlyNew || undefined,
            only_in_stock: filters.onlyInStock || undefined,
            min_price: hasValidPrice(filters.minPrice) ? filters.minPrice : undefined,
            max_price: hasValidPrice(filters.maxPrice) ? filters.maxPrice : undefined,
            sort: filters.sort,
          },
        })
        setProducts(response.data.items)
        setMeta({
          total: response.data.total,
          page: response.data.page,
          page_size: response.data.page_size,
          total_pages: response.data.total_pages,
        })
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setError('Mahsulotlarni yuklab bo‘lmadi')
        }
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [
    categoryOptions,
    filters.category,
    filters.gender,
    filters.maxPrice,
    filters.minPrice,
    filters.onlyInStock,
    filters.onlyNew,
    filters.page,
    filters.sort,
    filters.type,
    searchQuery,
  ])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    const paramMap = {
      onlyNew: 'new',
      onlyInStock: 'stock',
    }
    const actualKey = paramMap[key] || key
    const nextValue =
      actualKey === 'minPrice' || actualKey === 'maxPrice'
        ? String(value).replace(/[^\d]/g, '')
        : value

    if (nextValue === 'all' || nextValue === '' || nextValue === false) {
      next.delete(actualKey)
    } else {
      next.set(actualKey, String(nextValue))
    }
    if (actualKey !== 'page') {
      next.delete('page')
    }
    setSearchParams(next)
  }

  const resetFilters = () => setSearchParams({})

  const activeChips = [
    filters.gender !== 'all' ? { key: 'gender', label: filters.gender === 'men' ? t.navMen : filters.gender === 'women' ? t.navWomen : t.navUnisex } : null,
    filters.type !== 'all' ? { key: 'type', label: filters.type === 'shoe' ? t.shoeType : t.clothingType } : null,
    filters.category !== 'all' ? { key: 'category', label: categoryOptions.find((item) => item.slug === filters.category)?.[`name_${language}`] } : null,
    hasValidPrice(filters.minPrice) ? { key: 'minPrice', label: `${t.minPrice}: ${filters.minPrice}` } : null,
    hasValidPrice(filters.maxPrice) ? { key: 'maxPrice', label: `${t.maxPrice}: ${filters.maxPrice}` } : null,
    filters.onlyNew ? { key: 'onlyNew', label: t.onlyNew } : null,
    filters.onlyInStock ? { key: 'onlyInStock', label: t.onlyInStock } : null,
  ].filter(Boolean)

  const filterPanel = (
    <aside className="rounded-[22px] border border-black/6 bg-white/94 p-5 shadow-[0_18px_44px_rgba(15,15,16,0.045)] sm:p-6 lg:sticky lg:top-24">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-black">{t.filterTitle}</h2>
            {activeFilterCount ? (
              <span className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {meta.total} {t.resultsCount}
          </p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="shrink-0 rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
        >
          {t.resetFilters}
        </button>
      </div>

      <div className="space-y-5">
        <FilterBlock title={t.genderFilter}>
          {['all', 'men', 'women', 'unisex'].map((value) => (
            <RadioRow
              key={value}
              name="gender"
              checked={filters.gender === value}
              onChange={() => setFilter('gender', value)}
              label={value === 'all' ? t.all : value === 'men' ? t.navMen : value === 'women' ? t.navWomen : t.navUnisex}
            />
          ))}
        </FilterBlock>

        <FilterBlock title={t.typeFilter}>
          {['all', 'shoe', 'clothing'].map((value) => (
            <RadioRow
              key={value}
              name="type"
              checked={filters.type === value}
              onChange={() => setFilter('type', value)}
              label={value === 'all' ? t.all : value === 'shoe' ? t.shoeType : t.clothingType}
            />
          ))}
        </FilterBlock>

        <FilterBlock title={t.categoryFilter}>
          <RadioRow
            name="category"
            checked={filters.category === 'all'}
            onChange={() => setFilter('category', 'all')}
            label={t.all}
          />
          {categoryOptions.map((item) => (
            <RadioRow
              key={item.slug}
              name="category"
              checked={filters.category === item.slug}
              onChange={() => setFilter('category', item.slug)}
              label={item[`name_${language}`]}
            />
          ))}
        </FilterBlock>

        <FilterBlock title={t.priceFilter}>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" value={filters.minPrice} onChange={(event) => setFilter('minPrice', event.target.value)} placeholder={t.minPrice} className="min-h-12 min-w-0 rounded-lg border border-black/8 bg-white px-4 py-3 text-sm outline-none focus:border-black" />
            <input type="number" min="0" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} placeholder={t.maxPrice} className="min-h-12 min-w-0 rounded-lg border border-black/8 bg-white px-4 py-3 text-sm outline-none focus:border-black" />
          </div>
        </FilterBlock>

        <div className="space-y-2.5">
          <CheckboxRow checked={filters.onlyNew} onChange={(value) => setFilter('onlyNew', value)} label={t.onlyNew} />
          <CheckboxRow checked={filters.onlyInStock} onChange={(value) => setFilter('onlyInStock', value)} label={t.onlyInStock} />
        </div>
      </div>
    </aside>
  )

  return (
    <div className="mx-auto max-w-[1560px] px-3 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block">{filterPanel}</div>

        <div>
          <Breadcrumbs
            items={[
              { label: t.breadcrumbsHome, href: '/' },
              { label: t.breadcrumbsCatalog },
            ]}
          />

          <div className="mt-4 flex flex-col gap-4 rounded-[18px] border border-black/6 bg-white/94 p-4 shadow-[0_18px_44px_rgba(15,15,16,0.045)] sm:mt-5 sm:rounded-[22px] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight text-black sm:text-4xl lg:text-5xl">
                  {t.catalogTitle}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {loading ? '...' : meta.total} {t.resultsCount}
                </p>
              </div>

              <div className="grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(15,15,16,0.04)] lg:hidden"
                >
                  <FiFilter size={16} />
                  {t.filterOpen}
                  {activeFilterCount ? (
                    <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[11px] text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
                <SortDropdown
                  value={filters.sort}
                  options={sortOptions(t)}
                  onChange={(value) => setFilter('sort', value)}
                  label={t.sortBy}
                />
              </div>
            </div>

            {activeChips.length ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  {t.activeFilters}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFilter(chip.key, chip.key.startsWith('only') ? false : '')}
                      className="max-w-full rounded-lg border border-black/8 px-3.5 py-2 text-left text-sm text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button type="button" onClick={resetFilters} className="rounded-lg border border-transparent px-3.5 py-2 text-sm font-semibold text-zinc-500 hover:text-black">
                    {t.resetFilters}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="rounded-[22px] border border-black/6 bg-white/94 p-10 text-center text-zinc-500">
                Loading products...
              </div>
            ) : error ? (
              <div className="rounded-[22px] border border-black/6 bg-white/94 p-10 text-center text-zinc-500">
                {error}
              </div>
            ) : groupedProducts.length ? (
              <>
                <ProductGrid products={groupedProducts} />
                <div className="mt-8 flex items-center justify-between gap-4 rounded-[18px] border border-black/6 bg-white/94 p-4">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setFilter('page', meta.page - 1)}
                    className="min-h-11 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-500">
                    Page {meta.page} of {meta.total_pages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={meta.page >= meta.total_pages}
                    onClick={() => setFilter('page', meta.page + 1)}
                    className="min-h-11 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                title={t.emptyFilters}
                actionLabel={t.resetFilters}
                onReset={resetFilters}
              />
            )}
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={() => setFiltersOpen(false)}>
          <div
            className="flex h-full w-[92%] max-w-sm flex-col overflow-hidden bg-[#fcfbf8] shadow-[20px_0_70px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/6 px-4 py-4">
              <div>
                <h2 className="text-xl font-extrabold text-black">{t.filterTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500">{meta.total} {t.resultsCount}</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="min-h-10 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-500"
              >
                {t.filterClose}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {filterPanel}
            </div>
            <div className="border-t border-black/6 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-12 flex-1 rounded-lg border border-black/10 px-4 py-3 text-sm font-semibold text-black"
                >
                  {t.resetFilters}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="min-h-12 flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  {t.filterApply}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterBlock({ title, children }) {
  return (
    <div className="border-b border-black/6 pb-5 last:border-b-0 last:pb-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{title}</h3>
      <div className="mt-4 space-y-2.5">{children}</div>
    </div>
  )
}

function RadioRow({ name, checked, onChange, label }) {
  return (
    <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-black" />
      <span>{label}</span>
    </label>
  )
}

function CheckboxRow({ checked, onChange, label }) {
  return (
    <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-black" />
      <span>{label}</span>
    </label>
  )
}
