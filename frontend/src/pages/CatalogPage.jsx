import { useMemo, useState } from 'react'
import { FiFilter } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import { categories, products } from '../data/catalogData'
import { Breadcrumbs } from '../components/catalog/Breadcrumbs'
import { EmptyState } from '../components/catalog/EmptyState'
import { FilterDrawerMobile } from '../components/catalog/FilterDrawerMobile'
import { FilterSidebar } from '../components/catalog/FilterSidebar'
import { SortDropdown } from '../components/catalog/SortDropdown'
import { ProductGrid } from '../components/product/ProductGrid'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { filterProducts, getColorLabel } from '../utils/catalog'

const sortOptions = (t) => [
  { value: 'newest', label: t.sortNewest },
  { value: 'price-asc', label: t.sortPriceAsc },
  { value: 'price-desc', label: t.sortPriceDesc },
  { value: 'discount', label: t.sortDiscount },
]

function getActiveFilterCount(filters) {
  return [
    filters.gender !== 'all',
    filters.type !== 'all',
    filters.category !== 'all',
    filters.size !== 'all',
    filters.color !== 'all',
    hasValidPrice(filters.minPrice),
    hasValidPrice(filters.maxPrice),
    filters.onlyNew,
    filters.onlySale,
    filters.onlyInStock,
  ].filter(Boolean).length
}

function hasValidPrice(value) {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
}

export function CatalogPage() {
  const language = useShopStore((state) => state.language)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const t = translations[language]
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = {
    gender: searchParams.get('gender') || 'all',
    type: searchParams.get('type') || 'all',
    category: searchParams.get('category') || 'all',
    size: searchParams.get('size') || 'all',
    color: searchParams.get('color') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    onlyNew: searchParams.get('new') === 'true',
    onlySale: searchParams.get('sale') === 'true',
    onlyInStock: searchParams.get('stock') === 'true',
    sort: searchParams.get('sort') || 'newest',
  }

  const sizeOptions = useMemo(
    () => [
      ...new Set([
        38,
        39,
        40,
        41,
        42,
        43,
        'S',
        'M',
        'L',
        'XL',
        ...products.flatMap((product) => product.sizes.map((item) => item.size)),
      ]),
    ],
    [],
  )
  const colorOptions = useMemo(
    () => [...new Set(products.flatMap((product) => product.colors))],
    [],
  )

  const visibleProducts = filterProducts(products, {
    ...filters,
    query: searchQuery,
  })

  const activeFilterCount = getActiveFilterCount(filters)

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    const paramMap = {
      onlyNew: 'new',
      onlySale: 'sale',
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
    setSearchParams(next)
  }

  const resetFilters = () => setSearchParams({})

  const activeChips = [
    filters.gender !== 'all' ? { key: 'gender', label: filters.gender === 'men' ? t.navMen : filters.gender === 'women' ? t.navWomen : t.navUnisex } : null,
    filters.type !== 'all' ? { key: 'type', label: filters.type === 'shoe' ? t.shoeType : t.clothingType } : null,
    filters.category !== 'all' ? { key: 'category', label: categories.find((item) => item.slug === filters.category)?.[`name_${language}`] } : null,
    filters.size !== 'all' ? { key: 'size', label: `${t.sizeLabel}: ${filters.size}` } : null,
    filters.color !== 'all' ? { key: 'color', label: `${t.colorLabel}: ${getColorLabel(filters.color, t)}` } : null,
    hasValidPrice(filters.minPrice) ? { key: 'minPrice', label: `${t.minPrice}: ${filters.minPrice}` } : null,
    hasValidPrice(filters.maxPrice) ? { key: 'maxPrice', label: `${t.maxPrice}: ${filters.maxPrice}` } : null,
    filters.onlyNew ? { key: 'onlyNew', label: t.onlyNew } : null,
    filters.onlySale ? { key: 'onlySale', label: t.onlySale } : null,
    filters.onlyInStock ? { key: 'onlyInStock', label: t.onlyInStock } : null,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-10 sm:px-6 lg:px-10 lg:py-12 xl:px-14">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <FilterSidebar
            language={language}
            filters={filters}
            setFilter={setFilter}
            resetFilters={resetFilters}
            categories={categories}
            sizeOptions={sizeOptions}
            colorOptions={colorOptions}
            resultCount={visibleProducts.length}
            activeCount={activeFilterCount}
          />
        </div>

        <div>
          <Breadcrumbs
            items={[
              { label: t.breadcrumbsHome, href: '/' },
              { label: t.breadcrumbsCatalog },
            ]}
          />

          <div className="mt-5 flex flex-col gap-4 rounded-[22px] border border-black/6 bg-white/94 p-5 shadow-[0_18px_44px_rgba(15,15,16,0.045)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-black sm:text-4xl lg:text-5xl">
                  {t.catalogTitle}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {visibleProducts.length} {t.resultsCount}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end lg:hidden">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(15,15,16,0.04)]"
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

              <div className="hidden lg:block">
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
            {visibleProducts.length ? (
              <ProductGrid products={visibleProducts} />
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

      <FilterDrawerMobile
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        language={language}
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        categories={categories}
        sizeOptions={sizeOptions}
        colorOptions={colorOptions}
        resultCount={visibleProducts.length}
        activeCount={activeFilterCount}
      />
    </div>
  )
}
