import { useShopStore } from '../../store/useShopStore'

export function SizeSelector({ sizes, hasError = false }) {
  const selectedSize = useShopStore((state) => state.selectedSize)
  const selectSize = useShopStore((state) => state.selectSize)
  const gridClass = sizes.length <= 4 ? 'grid-cols-4' : 'grid-cols-6'

  return (
    <div
      className={`grid ${gridClass} gap-2 rounded-[18px] border bg-[#f7f7f5] p-2 transition-colors ${
        hasError ? 'border-[#ff3b30]/60 bg-[#fff5f4]' : 'border-transparent'
      }`}
    >
      {sizes.map(({ size, inStock }) => {
        const isSelected = selectedSize === size

        return (
          <button
            key={size}
            type="button"
            disabled={!inStock}
            onClick={() => selectSize(size)}
            className={`relative h-12 rounded-xl border text-sm font-semibold transition-all ${
              isSelected
                ? 'border-[#ff3b30] bg-[#ff3b30] text-white'
                : 'border-black/10 bg-white text-black hover:border-black/30'
            } ${
              !inStock
                ? 'cursor-not-allowed border-black/5 text-zinc-300'
                : 'cursor-pointer'
            }`}
          >
            {size}
            {!inStock ? (
              <span className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] bg-zinc-300" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
