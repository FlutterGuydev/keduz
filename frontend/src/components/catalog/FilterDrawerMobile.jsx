import { AnimatePresence, motion } from 'framer-motion'
import { FilterSidebar } from './FilterSidebar'
import { translations } from '../../i18n/translations'

export function FilterDrawerMobile({
  open,
  onClose,
  language,
  filters,
  setFilter,
  resetFilters,
  categories,
  sizeOptions,
  colorOptions,
  resultCount,
  activeCount = 0,
}) {
  const t = translations[language]

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/38 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex h-full w-[92%] max-w-sm flex-col overflow-hidden bg-[#fcfbf8] shadow-[20px_0_70px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/6 px-4 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-black">{t.filterTitle}</h2>
                {activeCount ? (
                  <span className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-semibold text-white">
                    {activeCount}
                  </span>
                ) : null}
              </div>
              <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-500">
                {t.filterClose}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <FilterSidebar
                language={language}
                filters={filters}
                setFilter={setFilter}
                resetFilters={resetFilters}
                categories={categories}
                sizeOptions={sizeOptions}
                colorOptions={colorOptions}
                resultCount={resultCount}
                activeCount={activeCount}
                compact
              />
            </div>
            <div className="border-t border-black/6 bg-white/90 px-4 py-4 backdrop-blur">
              <div className="mb-3 text-sm text-zinc-500">
                {resultCount} {t.resultsCount}
              </div>
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
                  onClick={onClose}
                  className="min-h-12 flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  {t.filterApply}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
