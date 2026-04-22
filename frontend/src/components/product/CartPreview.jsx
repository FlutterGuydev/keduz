import { FiTrash2 } from 'react-icons/fi'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'
import { formatPrice } from '../../utils/formatters'

export function CartPreview() {
  const language = useShopStore((state) => state.language)
  const clearCurrentSelection = useShopStore(
    (state) => state.clearCurrentSelection,
  )
  const cartItem = useShopStore((state) => state.cartItem)
  const t = translations[language]

  return (
    <div className="mt-5 rounded-[20px] border border-black/5 bg-white p-3 shadow-[0_14px_28px_rgba(15,15,16,0.05)] sm:mt-6 sm:rounded-[24px] sm:shadow-[0_14px_36px_rgba(15,15,16,0.05)]">
      {cartItem ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={cartItem.product.image}
            alt={cartItem.product[`name_${language}`]}
            className="h-16 w-16 rounded-[14px] object-cover sm:h-20 sm:w-20 sm:rounded-[18px]"
          />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-black">
              {cartItem.product[`name_${language}`]}
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              {t.sizeLabel}: {cartItem.size}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              {t.selectedColorLabel}
              <span
                className="inline-flex h-3 w-3 rounded-full border border-black/10"
                style={{ backgroundColor: cartItem.color }}
              />
            </p>
            <p className="mt-2 text-sm font-bold text-black">
              {formatPrice(cartItem.product.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={clearCurrentSelection}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2.5 text-[11px] font-semibold text-zinc-700 hover:border-[#ff3b30]/40 hover:text-[#ff3b30] sm:px-4 sm:py-3 sm:text-xs"
          >
            <FiTrash2 size={14} />
            {t.remove}
          </button>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-500">{t.emptyCart}</p>
      )}
    </div>
  )
}
