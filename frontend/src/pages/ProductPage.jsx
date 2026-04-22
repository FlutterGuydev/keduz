import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiHeart } from 'react-icons/fi'
import { products } from '../data/catalogData'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { formatPrice } from '../utils/formatters'
import { ProductGrid } from '../components/product/ProductGrid'
import { SizeGuide } from '../components/product/SizeGuide'

function similarityScore(product, target) {
  let score = 0
  if (product.category === target.category) score += 5
  if (product.type === target.type) score += 3
  if (product.gender.some((gender) => target.gender.includes(gender))) score += 2
  if (product.colors?.some((color) => target.colors?.includes(color))) score += 1
  return score
}

function ProductDetailView({ product, language, favorites, toggleFavorite, addToCart, t }) {
  const navigate = useNavigate()
  const [activeImage, setActiveImage] = useState(product?.gallery?.[0] ?? product?.image)
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] ?? null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)

  const relatedProducts = useMemo(() => {
    return products
      .filter((item) => item.id !== product.id)
      .map((item) => ({ item, score: similarityScore(item, product) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.item)
  }, [product])

  const showColorSelector = Array.isArray(product.colors) && product.colors.length > 1

  const handleAddToCart = () => {
    const hasSizes = product.sizes?.length > 0

    if (hasSizes && !selectedSize) {
      setSizeError(true)
      return
    }

    addToCart({ product, size: selectedSize, color: selectedColor, quantity: 1 })
    navigate('/cart')
  }

  return (
    <div className="mx-auto max-w-[1560px] px-3 py-6 sm:px-6 sm:py-10 lg:px-10 xl:px-14">
      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 xl:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <div className="overflow-hidden rounded-[18px] bg-[#f4f4f2] shadow-[0_18px_48px_rgba(15,15,16,0.055)] sm:rounded-[28px]">
            <img src={activeImage} alt={product[`name_${language}`]} className="h-[430px] w-full object-cover object-center sm:h-[560px] lg:h-[650px]" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
            {product.gallery.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(image)}
                className={`w-24 shrink-0 overflow-hidden rounded-[14px] border bg-white transition-all sm:w-auto sm:rounded-[20px] ${activeImage === image ? 'border-black shadow-[0_12px_28px_rgba(15,15,16,0.08)]' : 'border-black/8 hover:border-black/20'}`}
              >
                <img src={image} alt={product[`name_${language}`]} className="h-24 w-full object-cover sm:h-28" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-black/6 bg-white/96 p-5 shadow-[0_18px_48px_rgba(15,15,16,0.055)] sm:rounded-[28px] sm:p-8 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-zinc-400">
                {product.type === 'shoe' ? t.shoeType : t.clothingType}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight text-black sm:text-4xl lg:text-5xl">
                {product[`name_${language}`]}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white transition-colors hover:border-black/20"
            >
              <FiHeart size={21} strokeWidth={1.8} className={favorites.includes(product.id) ? 'fill-[#ff3b30] text-[#ff3b30]' : ''} />
            </button>
          </div>

          <div className="mt-5 flex items-end gap-3 sm:mt-6">
            <span className="text-2xl font-extrabold text-black sm:text-3xl">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice ? (
              <span className="text-sm text-zinc-400 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            ) : null}
          </div>

          <p className="mt-6 text-sm leading-7 text-zinc-600">
            {product[`description_${language}`]}
          </p>

          {showColorSelector ? (
            <div className="mt-8">
              <p className="text-sm font-bold text-black">{t.colorLabel}</p>
              <div className="mt-3 flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-11 w-11 rounded-full border-2 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.85)] transition-all ${selectedColor === color ? 'scale-105 border-[#ff3b30] ring-4 ring-[#ff3b30]/10' : 'border-black/10 hover:border-black/30'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-black">{t.sizeLabel}</p>
              <div className="max-w-[58%] text-right sm:max-w-none">
                <SizeGuide language={language} />
              </div>
            </div>
            <div className={`mt-3 grid grid-cols-4 gap-2 rounded-[18px] sm:flex sm:flex-wrap sm:gap-3 sm:rounded-[24px] ${sizeError ? 'border border-[#ff3b30]/30 p-3' : ''}`}>
              {product.sizes.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  disabled={!item.inStock}
                  onClick={() => {
                    setSelectedSize(item.size)
                    setSizeError(false)
                  }}
                  className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition-all sm:min-w-[54px] sm:rounded-full sm:px-4 ${
                    selectedSize === item.size
                      ? 'border-[#ff3b30] bg-[#ff3b30] text-white'
                      : item.inStock
                        ? 'border-black/10 bg-white text-black hover:border-black/30'
                        : 'cursor-not-allowed border-black/8 text-zinc-300 line-through'
                  }`}
                >
                  {item.size}
                </button>
              ))}
            </div>
            {sizeError ? <p className="mt-3 text-xs font-semibold text-[#ff3b30]">{t.sizeRequired}</p> : null}
          </div>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <button type="button" onClick={handleAddToCart} className="inline-flex min-h-12 justify-center rounded-xl bg-[#ff3b30] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,59,48,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(255,59,48,0.32)] sm:flex-none sm:rounded-full">
              {t.addToCart}
            </button>
            <Link to="/cart" className="inline-flex min-h-12 justify-center rounded-xl border border-black/10 bg-white px-6 py-4 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:flex-none sm:rounded-full">
              {t.cartTitle}
            </Link>
          </div>
        </div>
      </div>

      {relatedProducts.length ? (
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-[#ff3b30]">Related</p>
              <h2 className="mt-2 text-3xl font-extrabold text-black">{t.relatedProducts}</h2>
            </div>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      ) : null}
    </div>
  )
}

export function ProductPage() {
  const { id } = useParams()
  const language = useShopStore((state) => state.language)
  const favorites = useShopStore((state) => state.favorites)
  const toggleFavorite = useShopStore((state) => state.toggleFavorite)
  const addToCart = useShopStore((state) => state.addToCart)
  const t = translations[language]
  const product = useMemo(() => products.find((item) => String(item.id) === id), [id])

  if (!product) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-16 text-zinc-500 sm:px-6 lg:px-10 xl:px-14">
        {t.emptyState}
      </div>
    )
  }

  return (
    <ProductDetailView
      key={product.id}
      product={product}
      language={language}
      favorites={favorites}
      toggleFavorite={toggleFavorite}
      addToCart={addToCart}
      t={t}
    />
  )
}
