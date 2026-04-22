import { motion } from 'framer-motion'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'
import { formatPrice } from '../../utils/formatters'
import { OrderForm } from '../form/OrderForm'
import { CartPreview } from './CartPreview'
import { SizeSelector } from './SizeSelector'
import { SizeGuide } from './SizeGuide'

export function ProductDetailPanel() {
  const language = useShopStore((state) => state.language)
  const product = useShopStore((state) => state.selectedProduct)
  const selectedColor = useShopStore((state) => state.selectedColor)
  const selectedSize = useShopStore((state) => state.selectedSize)
  const selectColor = useShopStore((state) => state.selectColor)
  const t = translations[language]

  if (!product) {
    return (
      <aside className="rounded-[24px] border border-black/5 bg-white p-6 text-left shadow-[0_14px_30px_rgba(15,15,16,0.05)] sm:rounded-[28px] sm:p-8 sm:shadow-[0_14px_36px_rgba(15,15,16,0.05)]">
        <h2 className="text-lg font-extrabold tracking-[-0.05em] text-black sm:text-xl">
          {t.chooseProduct}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
          {t.chooseProductHint}
        </p>
      </aside>
    )
  }

  return (
    <motion.aside
      key={product.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-[24px] border border-black/5 bg-white p-3 shadow-[0_14px_30px_rgba(15,15,16,0.05)] sm:rounded-[28px] sm:p-4 sm:shadow-[0_14px_36px_rgba(15,15,16,0.05)]"
    >
      <div className="overflow-hidden rounded-[18px] bg-zinc-100 sm:rounded-[22px]">
        <img
          src={product.detailImage}
          alt={product[`detailName_${language}`]}
          className="h-[220px] w-full object-cover sm:h-[360px]"
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <h2 className="text-lg font-extrabold tracking-[-0.05em] text-black sm:text-xl">
          {product[`detailName_${language}`]}
        </h2>
        <p className="mt-2 text-sm leading-5 text-zinc-500 sm:mt-3 sm:leading-6">
          {product[`description_${language}`]}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-black">{t.colorLabel}</h3>
        <div className="mt-3 flex gap-3">
          {product.colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => selectColor(color)}
              className={`h-9 w-9 rounded-full border-2 transition-all ${
                selectedColor === color
                  ? 'scale-105 border-[#ff3b30] ring-4 ring-[#ff3b30]/10'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-black">{t.sizeLabel}</h3>
          <SizeGuide language={language} />
        </div>
        <SizeSelector
          sizes={product.sizes}
          hasError={Boolean(product && !selectedSize)}
        />
      </div>

      <div className="mt-6 text-2xl font-extrabold tracking-[-0.06em] text-black">
        {formatPrice(product.price)}
      </div>

      <OrderForm product={product} />
      <CartPreview />
    </motion.aside>
  )
}
