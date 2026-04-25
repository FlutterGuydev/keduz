import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useShopStore } from '../../store/useShopStore'
import { formatPrice } from '../../utils/formatters'
import { getLocalizedText } from '../../utils/catalog'
import { getImageUrl, handleImageError } from '../../utils/imageUrl'
import { translations } from '../../i18n/translations'

function getDisplayPrice(primaryPrice, fallbackPrice) {
  const price = Number(primaryPrice)
  if (Number.isFinite(price) && price > 0) {
    return primaryPrice
  }
  return fallbackPrice
}

function getProductImageCandidates(product, variants) {
  return [
    product.cover_image,
    product.image,
    ...(product.images || []),
    ...variants.flatMap((variant) => [
      variant.product?.cover_image,
      variant.product?.image,
      ...(variant.product?.images || []),
    ]),
  ].filter(Boolean)
}

export function ProductCard({ product }) {
  const language = useShopStore((state) => state.language)
  const favorites = useShopStore((state) => state.favorites)
  const toggleFavorite = useShopStore((state) => state.toggleFavorite)
  const t = translations[language]
  const variants = useMemo(() => product.grouped_variants || [], [product.grouped_variants])
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const selectedVariant = variants.find((variant) => variant.productId === selectedVariantId) || null
  const selectedSize = selectedVariant?.size || ''

  const activeProductId = selectedVariant?.productId || product.detail_id || product.product_id || product.id
  const detailUrl = `/product/${activeProductId}`
  const isFavorite = favorites.includes(activeProductId)
  const images = useMemo(() => {
    const productImages = getProductImageCandidates(product, variants).map(getImageUrl)
    return Array.from(new Set(productImages)).filter(Boolean).slice(0, 4)
  }, [product, variants])
  const image = images[activeImageIndex] || getImageUrl(product.cover_image || product.image)
  const name = product[`name_${language}`] || product.name_uz || product.name_ru
  const oldPrice = product.old_price ?? product.oldPrice
  const discountPercent = product.discount_percent ?? product.discountPercent
  const isNew = product.is_new ?? product.isNew
  const displayPrice = getDisplayPrice(selectedVariant?.price, product.price)
  const displayOldPrice = getDisplayPrice(selectedVariant?.old_price, oldPrice)
  const displayStock = selectedVariant?.stock_quantity ?? product.stock_quantity
  const productLabel = product[`category_name_${language}`] || (product.type === 'shoe' || product.section_slugs?.includes('shoe') ? t.shoeType : t.clothingType)
  const inStock = selectedVariant
    ? selectedVariant.in_stock
    : product.in_stock ?? product.inStock ?? true

  const selectVariant = (variant) => {
    if (!variant.in_stock) return
    setSelectedVariantId(variant.productId)
  }

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-black/6 bg-white shadow-[0_14px_34px_rgba(15,15,16,0.05)] transition-shadow duration-300 hover:shadow-[0_22px_54px_rgba(15,15,16,0.08)] sm:rounded-[22px]"
    >
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-[#f1f0ec]">
        <Link to={detailUrl}>
          <img
            src={image}
            alt={name}
            onError={handleImageError}
            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.045]"
          />
        </Link>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            toggleFavorite(activeProductId)
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute right-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/94 text-black shadow-[0_10px_24px_rgba(15,15,16,0.12)] backdrop-blur transition-all hover:scale-[1.04] hover:bg-white sm:right-4 sm:top-4 sm:h-11 sm:w-11"
          aria-label={t.favoritesTitle}
        >
          <FiHeart size={20} strokeWidth={1.8} className={isFavorite ? 'fill-[#ff3b30] text-[#ff3b30]' : ''} />
        </button>
        {!inStock ? (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold uppercase text-white sm:left-4 sm:top-4 sm:px-3 sm:text-[11px]">
            Нет в наличии
          </span>
        ) : isNew ? (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-black px-2.5 py-1.5 text-[10px] font-bold uppercase text-white sm:left-4 sm:top-4 sm:px-3 sm:text-[11px]">
            {t.newBadge}
          </span>
        ) : null}
        {discountPercent ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-[#ff3b30] px-2.5 py-1.5 text-[10px] font-bold text-white sm:bottom-4 sm:left-4 sm:px-3 sm:text-[11px]">
            -{discountPercent}%
          </span>
        ) : null}
        {images.length > 1 ? (
          <div className="absolute inset-x-2.5 bottom-2.5 grid grid-cols-4 gap-1.5 rounded-full bg-white/80 p-1.5 opacity-100 shadow-[0_10px_24px_rgba(15,15,16,0.12)] backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            {images.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setActiveImageIndex(index)
                }}
                className={`h-1.5 rounded-full transition-colors ${activeImageIndex === index ? 'bg-black' : 'bg-black/18'}`}
                aria-label={`Image ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5 sm:gap-4 sm:p-5">
        <div className="space-y-1.5">
          <p className="min-h-4 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 sm:text-[11px]">
            {productLabel}
          </p>
          <Link
            to={detailUrl}
            className="line-clamp-2 min-h-[36px] text-[15px] font-extrabold leading-tight text-black transition-colors hover:text-[#ff3b30] sm:min-h-[44px] sm:text-lg"
          >
            {name || getLocalizedText(product, language)}
          </Link>
        </div>
        <div className="space-y-3">
          <div className="flex min-h-[32px] flex-col items-start justify-end gap-0.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-3 sm:gap-y-1">
            <span className="text-base font-extrabold leading-tight text-black sm:text-lg">{formatPrice(displayPrice)}</span>
            {displayOldPrice ? (
              <span className="text-xs font-semibold text-zinc-400 line-through sm:text-sm">
                {formatPrice(displayOldPrice)}
              </span>
            ) : null}
          </div>
          {variants.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {variants.slice(0, 6).map((variant) => (
                  <button
                    key={`${variant.productId}-${variant.size}`}
                    type="button"
                    disabled={!variant.in_stock}
                    onClick={() => selectVariant(variant)}
                    className={`min-h-8 min-w-9 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                      selectedSize === variant.size
                        ? 'border-black bg-black text-white'
                        : variant.in_stock
                          ? 'border-black/10 bg-white text-black hover:border-black/30'
                          : 'cursor-not-allowed border-black/8 bg-zinc-100 text-zinc-300 line-through'
                    }`}
                    aria-label={`Size ${variant.size}`}
                  >
                    {variant.size}
                  </button>
                ))}
                {variants.length > 6 ? (
                  <span className="inline-flex min-h-8 min-w-9 items-center justify-center rounded-lg border border-black/8 bg-zinc-50 px-2 text-xs font-bold text-zinc-500">
                    +{variants.length - 6}
                  </span>
                ) : null}
              </div>
              <p className={`hidden text-xs font-semibold sm:block ${inStock ? 'text-green-700' : 'text-zinc-400'}`}>
                {selectedVariant
                  ? inStock
                    ? `В наличии: ${displayStock}`
                    : 'Нет в наличии'
                  : inStock
                    ? 'Выберите размер'
                    : 'Нет в наличии'}
              </p>
            </div>
          ) : null}
          <Link
            to={detailUrl}
            className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold transition-colors sm:px-4 ${
              inStock
                ? 'bg-black text-white hover:bg-[#ff3b30]'
                : 'border border-black/10 bg-white text-zinc-500 hover:border-black/25 hover:text-black'
            }`}
          >
            {t.viewProduct}
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
