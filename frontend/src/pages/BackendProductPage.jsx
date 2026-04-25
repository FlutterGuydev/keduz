import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiHeart, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { formatPrice } from '../utils/formatters'
import { getImageUrl, handleImageError } from '../utils/imageUrl'
import { getBaseProductName, getProductSizeFromName, groupProductsByBaseName, splitVariantName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'
import { SizeGuide } from '../components/product/SizeGuide'

function getImageUrls(product, groupedVariants = []) {
  const ownGallery = product?.images?.map((image) => image.image_url).filter(Boolean) || []
  const siblingImages = groupedVariants
    .map((variant) => variant.product?.cover_image || variant.product?.image)
    .filter(Boolean)
  const images = [
    product?.cover_image || product?.image,
    ...ownGallery,
    ...siblingImages,
  ].filter(Boolean)
  const uniqueImages = Array.from(new Set(images))
  return uniqueImages.length ? uniqueImages.map(getImageUrl) : [getImageUrl('')]
}

function getColorValue(color) {
  return color.color_hex || color.color_name
}

function normalizeStockItem(item) {
  const stock = Number(item.total_stock ?? item.stock_quantity ?? item.stock ?? 0)
  return {
    id: item.id,
    size: item.size,
    sku: item.sku || null,
    price: item.price,
    total_stock: Number.isFinite(stock) ? stock : 0,
    stock_quantity: Number.isFinite(stock) ? stock : 0,
    in_stock: item.in_stock ?? stock > 0,
  }
}

function getStockItems(product, groupedVariants = []) {
  if (groupedVariants.length) {
    return groupedVariants.map((item) => ({
      id: item.productId,
      productId: item.productId,
      size: item.size,
      sku: item.sku || null,
      price: item.price,
      old_price: item.old_price,
      total_stock: item.stock_quantity,
      stock_quantity: item.stock_quantity,
      in_stock: Boolean(item.in_stock),
      product: item.product,
    }))
  }

  const variants = product?.variants?.map(normalizeStockItem).filter((item) => item.size) || []
  if (variants.length) {
    return [...variants].sort((a, b) => String(a.size).localeCompare(String(b.size), 'ru', { numeric: true }))
  }

  return product?.sizes?.map((item) => ({
    id: item.id,
    size: item.size,
    sku: null,
    price: null,
    stock_quantity: item.in_stock ? Number(product.stock_quantity || 0) : 0,
    in_stock: Boolean(item.in_stock),
  })) || []
}

function getDisplayName(product, language) {
  const value = product?.[`name_${language}`] || product?.name_uz || product?.name_ru || ''
  return splitVariantName(value).baseName || value
}

function getDisplayPrice(primaryPrice, fallbackPrice) {
  const price = Number(primaryPrice)
  if (Number.isFinite(price) && price > 0) {
    return primaryPrice
  }
  return fallbackPrice
}

export function BackendProductPage() {
  const { id } = useParams()
  const language = useShopStore((state) => state.language)
  const favorites = useShopStore((state) => state.favorites)
  const toggleFavorite = useShopStore((state) => state.toggleFavorite)
  const t = translations[language]
  const [product, setProduct] = useState(null)
  const [groupedVariants, setGroupedVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImage, setActiveImage] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)
  const [orderAccepted, setOrderAccepted] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({ full_name: '', phone: '' })
  const [orderError, setOrderError] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProduct() {
      setLoading(true)
      setError('')
      try {
        const response = await storeApi.get(`/store/products/${id}`, {
          signal: controller.signal,
        })
        const detail = response.data
        console.log('Storefront product response', detail)
        let variants = []
        const baseName = getBaseProductName(detail, language)
        const ownSize = getProductSizeFromName(detail)
        if (baseName && ownSize) {
          try {
            const siblingsResponse = await storeApi.get('/store/products', {
              signal: controller.signal,
              params: {
                page: 1,
                page_size: 100,
                search: baseName,
              },
            })
            const grouped = groupProductsByBaseName(siblingsResponse.data.items || [])
            const currentGroup = grouped.find((item) =>
              item.grouped_variants?.some((variant) => Number(variant.productId) === Number(detail.id)),
            )
            variants = currentGroup?.grouped_variants || []
          } catch {
            variants = []
          }
        }

        setProduct(detail)
        setGroupedVariants(variants)
        const images = getImageUrls(detail, variants)
        setActiveImage(images[0] || '')
        setSelectedColor(detail.colors?.[0] || null)
        const stockItems = getStockItems(detail, variants)
        const firstAvailable = stockItems.find((item) => item.in_stock)
        setSelectedSize(firstAvailable?.size || stockItems[0]?.size || null)
        setSizeError(false)
        setOrderAccepted(false)
        setOrderModalOpen(false)
        setOrderForm({ full_name: '', phone: '' })
        setOrderError('')
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setError(t.emptyState)
        }
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
    return () => controller.abort()
  }, [id, language, t.emptyState])

  const images = useMemo(
    () => (product ? getImageUrls(product, groupedVariants) : []),
    [product, groupedVariants],
  )
  const displayName = getDisplayName(product, language)
  const description = product?.[`description_${language}`] || product?.description_uz || product?.description_ru
  const stockItems = useMemo(() => getStockItems(product, groupedVariants), [product, groupedVariants])
  const selectedStockItem = selectedSize
    ? stockItems.find((item) => item.size === selectedSize)
    : null
  const hasSizes = stockItems.length > 0
  const inStock = hasSizes
    ? Boolean(selectedStockItem?.in_stock)
    : Boolean(product?.in_stock)
  const visibleStockQuantity = selectedStockItem?.stock_quantity ?? product?.stock_quantity ?? 0
  const activePrice = getDisplayPrice(selectedStockItem?.price, product?.price)
  const activeOldPrice = getDisplayPrice(selectedStockItem?.old_price, product?.old_price)
  const availableColors = product?.colors || []
  const showColorSelector = availableColors.length > 1
  const canAddToCart = hasSizes ? Boolean(selectedStockItem?.in_stock) : inStock

  const handleOrder = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true)
      return
    }
    if (!canAddToCart) return
    setOrderAccepted(false)
    setOrderError('')
    setOrderModalOpen(true)
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    const fullName = orderForm.full_name.trim()
    const phone = orderForm.phone.trim()
    const cleanedPhone = phone.replace(/\D/g, '')

    if (!fullName || !cleanedPhone) {
      setOrderError('Заполните имя и телефон.')
      return
    }
    setOrderSubmitting(true)
    setOrderError('')
    try {
      await storeApi.post('/orders', {
        product_id: selectedStockItem?.productId || product.id,
        product_title: displayName,
        selected_size: selectedSize,
        selected_color: selectedColor?.color_name || selectedColor?.color_hex || null,
        price: activePrice,
        full_name: fullName,
        phone,
        quantity: 1,
      })
      setOrderModalOpen(false)
      setOrderAccepted(true)
      setOrderForm({ full_name: '', phone: '' })
      Swal.fire({
        icon: 'success',
        title: 'Buyurtma qabul qilindi!',
        text: 'Tez orada siz bilan bog‘lanamiz',
        confirmButtonColor: '#ff3b30',
      })
    } catch (err) {
      setOrderError(err.response?.data?.detail || 'Не удалось отправить заказ. Позвоните нам, и мы поможем оформить заказ.')
    } finally {
      setOrderSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-16 text-zinc-500 sm:px-6 lg:px-10 xl:px-14">
        Loading product...
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-16 text-zinc-500 sm:px-6 lg:px-10 xl:px-14">
        {error || t.emptyState}
      </div>
    )
  }

  console.log(product)

  return (
    <div className="mx-auto max-w-[1560px] px-3 py-6 sm:px-6 sm:py-10 lg:px-10 xl:px-14">
      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 xl:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <div className="overflow-hidden rounded-[18px] bg-[#f4f4f2] shadow-[0_18px_48px_rgba(15,15,16,0.055)] sm:rounded-[28px]">
            {activeImage ? (
              <img src={activeImage} alt={displayName} onError={handleImageError} className="h-[430px] w-full object-cover object-center sm:h-[560px] lg:h-[650px]" />
            ) : (
              <div className="flex h-[430px] w-full items-center justify-center text-xl font-semibold text-zinc-400 sm:h-[560px] lg:h-[650px]">
                KED UZ
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
              {images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`w-24 shrink-0 overflow-hidden rounded-[14px] border bg-white transition-all sm:w-auto sm:rounded-[20px] ${activeImage === image ? 'border-black shadow-[0_12px_28px_rgba(15,15,16,0.08)]' : 'border-black/8 hover:border-black/20'}`}
                >
                  <img src={image} alt={displayName} onError={handleImageError} className="h-24 w-full object-cover sm:h-28" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[18px] border border-black/6 bg-white/96 p-5 shadow-[0_18px_48px_rgba(15,15,16,0.055)] sm:rounded-[28px] sm:p-8 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight text-black sm:text-4xl lg:text-5xl">
                {displayName}
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

          <div className="mt-5 flex flex-wrap items-end gap-3 sm:mt-6">
            <span className="text-2xl font-extrabold text-black sm:text-3xl">
              {formatPrice(activePrice)}
            </span>
            {activeOldPrice ? (
              <span className="text-sm text-zinc-400 line-through">
                {formatPrice(activeOldPrice)}
              </span>
            ) : null}
          </div>

          <div className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase ${inStock ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
            {inStock ? `В наличии: ${visibleStockQuantity}` : 'Нет в наличии'}
          </div>

          {description ? (
            <p className="mt-6 text-sm leading-7 text-zinc-600">
              {description}
            </p>
          ) : null}

          {showColorSelector ? (
            <div className="mt-8">
              <p className="text-sm font-bold text-black">{t.colorLabel}</p>
              <div className="mt-3 flex gap-3">
                {availableColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-11 w-11 rounded-full border-2 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.85)] transition-all ${selectedColor?.id === color.id ? 'scale-105 border-[#ff3b30] ring-4 ring-[#ff3b30]/10' : 'border-black/10 hover:border-black/30'}`}
                    style={{ backgroundColor: getColorValue(color) }}
                    title={color.color_name}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {stockItems.length ? (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-black">{t.sizeLabel}</p>
                <div className="max-w-[58%] text-right sm:max-w-none">
                  <SizeGuide language={language} />
                </div>
              </div>
              <div className={`mt-3 grid grid-cols-4 gap-2 rounded-[18px] sm:flex sm:flex-wrap sm:gap-3 sm:rounded-[24px] ${sizeError ? 'border border-[#ff3b30]/30 p-3' : ''}`}>
                {stockItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.in_stock}
                    onClick={() => {
                      setSelectedSize(item.size)
                      setSizeError(false)
                      setOrderAccepted(false)
                    }}
                    title={item.in_stock ? `В наличии: ${item.stock_quantity}` : 'Нет в наличии'}
                    className={`relative min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition-all sm:min-w-[54px] sm:rounded-full sm:px-4 ${
                      selectedSize === item.size
                        ? 'border-[#ff3b30] bg-[#ff3b30] text-white'
                        : item.in_stock
                          ? 'border-black/10 bg-white text-black hover:border-black/30'
                          : 'cursor-not-allowed border-black/8 text-zinc-300 line-through'
                    }`}
                  >
                    {item.size}
                    {!item.in_stock ? (
                      <span className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-zinc-300" />
                    ) : null}
                  </button>
                ))}
              </div>
              {sizeError ? <p className="mt-3 text-xs font-semibold text-[#ff3b30]">{t.sizeRequired}</p> : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <button
              type="button"
              disabled={!canAddToCart}
              onClick={handleOrder}
              className="inline-flex min-h-12 justify-center rounded-xl bg-[#ff3b30] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,59,48,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(255,59,48,0.32)] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:flex-none sm:rounded-full"
            >
              {canAddToCart ? 'Заказать' : 'Нет в наличии'}
            </button>
            <Link to="/catalog" className="inline-flex min-h-12 justify-center rounded-xl border border-black/10 bg-white px-6 py-4 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:flex-none sm:rounded-full">
              {t.breadcrumbsCatalog}
            </Link>
          </div>
          {orderAccepted ? (
            <p className="mt-4 rounded-[18px] bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-700">
              Заказ принят. Наш оператор свяжется с вами в течение 5 минут.
            </p>
          ) : null}
        </div>
      </div>
      {orderModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <form
            onSubmit={submitOrder}
            className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_32px_80px_rgba(0,0,0,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-black">Оформить заказ</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Operator siz bilan tez orada bog'lanadi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10"
                aria-label="Закрыть"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-[20px] bg-[#f7f5f2] p-4 text-sm text-zinc-700">
              <p className="font-bold text-black">{displayName}</p>
              <p className="mt-1">Размер: {selectedSize || '-'}</p>
              <p>Цена: {formatPrice(activePrice)}</p>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={orderForm.full_name}
                onChange={(event) => setOrderForm((current) => ({ ...current, full_name: event.target.value }))}
                placeholder="Имя и фамилия"
                className="w-full rounded-full border border-black/10 px-5 py-3.5 text-sm outline-none focus:border-black"
              />
              <input
                type="tel"
                inputMode="tel"
                value={orderForm.phone}
                onChange={(event) => setOrderForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Telefon raqamingiz"
                className="w-full rounded-full border border-black/10 px-5 py-3.5 text-sm outline-none focus:border-black"
              />
              {orderError ? <p className="text-sm font-semibold text-[#ff3b30]">{orderError}</p> : null}
              <button
                type="submit"
                disabled={orderSubmitting}
                className="flex w-full items-center justify-center rounded-full bg-[#ff3b30] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,59,48,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {orderSubmitting ? 'Отправляем...' : 'Отправить заказ'}
              </button>
              <p className="text-center text-xs text-zinc-500">Телефон для заказа: +998 90 123 45 67</p>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
