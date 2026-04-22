export function splitVariantName(name) {
  if (!name || typeof name !== 'string') {
    return { baseName: '', size: '' }
  }

  const parts = name
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) {
    return { baseName: name.trim(), size: '' }
  }

  return {
    baseName: parts.slice(0, -1).join(' / '),
    size: parts.at(-1),
  }
}

function normalizeGroupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getDisplayName(product, language = 'uz') {
  return (
    product?.[`name_${language}`] ||
    product?.name_uz ||
    product?.name_ru ||
    product?.billz_title ||
    ''
  )
}

function getArticleBase(product) {
  const sku = product.billz_sku || product.sku || ''
  return String(sku).replace(/[\s_-]*(?:\/\s*)?\d{2,3}$/g, '').trim()
}

function getNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getVariantSortValue(size) {
  const numeric = Number(String(size).replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : String(size)
}

function sortVariants(variants) {
  return [...variants].sort((a, b) => {
    const first = getVariantSortValue(a.size)
    const second = getVariantSortValue(b.size)

    if (typeof first === 'number' && typeof second === 'number') {
      return first - second
    }

    return String(first).localeCompare(String(second), 'ru', { numeric: true })
  })
}

function pickDisplayProduct(products) {
  return (
    products.find((product) => (product.in_stock ?? product.stock_quantity > 0)) ||
    products[0]
  )
}

function pickImageProduct(products, displayProduct) {
  return (
    products.find((product) => product.cover_image || product.image) ||
    displayProduct
  )
}

export function getBaseProductName(product, language = 'uz') {
  const localizedName = product?.[`name_${language}`]
  const fallbackName = product?.name_uz || product?.name_ru || product?.billz_title || ''
  return splitVariantName(localizedName || fallbackName).baseName || fallbackName
}

export function getProductSizeFromName(product) {
  const uzParts = splitVariantName(product?.name_uz)
  const ruParts = splitVariantName(product?.name_ru)
  const billzParts = splitVariantName(product?.billz_title)
  return uzParts.size || ruParts.size || billzParts.size || ''
}

export function groupProductsByBaseName(products) {
  const groups = new Map()

  products.forEach((product) => {
    const uzParts = splitVariantName(product.name_uz)
    const ruParts = splitVariantName(product.name_ru)
    const billzParts = splitVariantName(product.billz_title)
    const skuBase = getArticleBase(product)
    const hasVariantSuffix = Boolean(uzParts.size || ruParts.size || billzParts.size)
    const fallbackBase = uzParts.baseName || ruParts.baseName || billzParts.baseName || product.name_uz || product.name_ru || product.billz_title || `Product ${product.id}`
    const groupKey = [
      normalizeGroupKey(skuBase || fallbackBase),
      product.category_id || '',
      hasVariantSuffix ? 'variant-group' : product.id,
    ].join('|')

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }

    groups.get(groupKey).push(product)
  })

  return Array.from(groups.entries()).map(([groupKey, groupProducts]) => {
    const displayProduct = pickDisplayProduct(groupProducts)
    const imageProduct = pickImageProduct(groupProducts, displayProduct)
    const uzBase = splitVariantName(displayProduct.name_uz).baseName || splitVariantName(displayProduct.billz_title).baseName || displayProduct.name_uz
    const ruBase = splitVariantName(displayProduct.name_ru).baseName || splitVariantName(displayProduct.billz_title).baseName || displayProduct.name_ru
    const variants = sortVariants(
      groupProducts.map((product) => {
        const size = getProductSizeFromName(product)
        const stock = getNumber(product.stock_quantity)

        return {
          id: product.id,
          productId: product.id,
          size: String(size || ''),
          sku: product.billz_sku || product.sku || null,
          stock,
          stock_quantity: stock,
          price: getNumber(product.price),
          old_price: product.old_price,
          in_stock: product.in_stock ?? stock > 0,
          title: getDisplayName(product),
          product,
        }
      }),
    )
    const prices = variants.map((variant) => variant.price).filter((price) => price > 0)
    const minPrice = prices.length ? Math.min(...prices) : getNumber(displayProduct.price)
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0)
    const visibleVariants = variants.filter((variant) => variant.size)

    return {
      ...displayProduct,
      id: `group-${groupKey}`,
      product_id: displayProduct.id,
      detail_id: displayProduct.id,
      name_uz: uzBase,
      name_ru: ruBase,
      cover_image: displayProduct.cover_image || imageProduct.cover_image || null,
      image: displayProduct.image || imageProduct.image || imageProduct.cover_image || null,
      price: minPrice,
      stock_quantity: totalStock,
      in_stock: variants.some((variant) => variant.in_stock),
      grouped_variants: visibleVariants,
      is_grouped_product: visibleVariants.length > 0,
    }
  })
}
