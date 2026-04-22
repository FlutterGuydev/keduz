import { translations } from '../../i18n/translations'
import { getColorLabel } from '../../utils/catalog'

function FilterSection({ title, children }) {
  return (
    <div className="border-b border-black/6 pb-5 last:border-b-0 last:pb-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{title}</h3>
      <div className="mt-4 space-y-2.5">{children}</div>
    </div>
  )
}

export function FilterSidebar({
  language,
  filters,
  setFilter,
  resetFilters,
  categories,
  sizeOptions,
  colorOptions,
  resultCount,
  activeCount = 0,
  compact = false,
}) {
  const t = translations[language]

  return (
    <aside
      className={`${
        compact
          ? 'p-0'
          : 'rounded-[22px] border border-black/6 bg-white/94 p-6 shadow-[0_18px_44px_rgba(15,15,16,0.045)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto'
      }`}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-black">{t.filterTitle}</h2>
            {activeCount ? (
              <span className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {resultCount} {t.resultsCount}
          </p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="shrink-0 rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
        >
          Hammasini tozalash
        </button>
      </div>

      <div className="space-y-5">
        <FilterSection title={t.genderFilter}>
          {['all', 'men', 'women', 'unisex'].map((value) => (
            <label
              key={value}
              className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]"
            >
              <input type="radio" name="gender" checked={filters.gender === value} onChange={() => setFilter('gender', value)} className="accent-black" />
              <span>{value === 'all' ? t.all : t[`nav${value.charAt(0).toUpperCase() + value.slice(1)}`]}</span>
            </label>
          ))}
        </FilterSection>

        <FilterSection title={t.typeFilter}>
          {['all', 'shoe', 'clothing'].map((value) => (
            <label key={value} className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
              <input type="radio" name="type" checked={filters.type === value} onChange={() => setFilter('type', value)} className="accent-black" />
              <span>{value === 'all' ? t.all : value === 'shoe' ? t.shoeType : t.clothingType}</span>
            </label>
          ))}
        </FilterSection>

        <FilterSection title={t.categoryFilter}>
          <div className="space-y-2">
            <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
              <input type="radio" name="category" checked={filters.category === 'all'} onChange={() => setFilter('category', 'all')} className="accent-black" />
              <span>{t.all}</span>
            </label>
            {categories.map((item) => (
              <label key={item.slug} className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
                <input type="radio" name="category" checked={filters.category === item.slug} onChange={() => setFilter('category', item.slug)} className="accent-black" />
                <span>{item[`name_${language}`]}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.sizeLabel}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilter('size', 'all')} className={`min-h-10 rounded-lg border px-3 py-2 text-sm transition-colors ${filters.size === 'all' ? 'border-black bg-black text-white' : 'border-black/8 bg-white text-black hover:border-black/18 hover:bg-black/[0.025]'}`}>
              {t.all}
            </button>
            {sizeOptions.map((size) => (
              <button key={size} type="button" onClick={() => setFilter('size', size)} className={`min-h-10 rounded-lg border px-3 py-2 text-sm transition-colors ${String(filters.size) === String(size) ? 'border-black bg-black text-white' : 'border-black/8 bg-white text-black hover:border-black/18 hover:bg-black/[0.025]'}`}>
                {size}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.colorLabel}>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setFilter('color', 'all')} className={`min-h-10 rounded-lg border px-3 py-2 text-sm transition-colors ${filters.color === 'all' ? 'border-black bg-black text-white' : 'border-black/8 bg-white text-black hover:border-black/18 hover:bg-black/[0.025]'}`}>
              {t.all}
            </button>
            {colorOptions.map((color) => (
              <button key={color} type="button" onClick={() => setFilter('color', color)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${filters.color === color ? 'border-black bg-black text-white' : 'border-black/8 bg-white text-black hover:border-black/18 hover:bg-black/[0.025]'}`}>
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                <span>{getColorLabel(color, t)}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.priceFilter}>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" inputMode="numeric" value={filters.minPrice} onChange={(event) => setFilter('minPrice', event.target.value)} placeholder={t.minPrice} className="min-h-12 min-w-0 rounded-lg border border-black/8 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-black" />
            <input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} placeholder={t.maxPrice} className="min-h-12 min-w-0 rounded-lg border border-black/8 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-black" />
          </div>
        </FilterSection>

        <FilterSection title={t.filterTitle}>
          <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
            <input type="checkbox" checked={filters.onlyNew} onChange={(event) => setFilter('onlyNew', event.target.checked)} className="accent-black" />
            <span>{t.onlyNew}</span>
          </label>
          <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
            <input type="checkbox" checked={filters.onlySale} onChange={(event) => setFilter('onlySale', event.target.checked)} className="accent-black" />
            <span>{t.onlySale}</span>
          </label>
          <label className="flex min-h-9 items-center gap-3 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-black/[0.025]">
            <input type="checkbox" checked={filters.onlyInStock} onChange={(event) => setFilter('onlyInStock', event.target.checked)} className="accent-black" />
            <span>{t.onlyInStock}</span>
          </label>
        </FilterSection>
      </div>
    </aside>
  )
}
