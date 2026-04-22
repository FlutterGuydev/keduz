export function getLocalizedText(item, language, field = 'name') {
  return item?.[`${field}_${language}`] ?? ''
}

export function getColorLabel(color, t) {
  const colorMap = {
    '#0f0f10': t.colorBlack,
    '#ff3b30': t.colorRed,
    '#ef4444': t.colorRed,
    '#f5f5f5': t.colorWhite,
    '#ffffff': t.colorWhite,
    '#1d4ed8': t.colorBlue,
    '#c4c4c4': t.colorGray,
    '#4b5563': t.colorGray,
    '#374151': t.colorGray,
    '#1f2937': t.colorGray,
    '#3f3f46': t.colorGray,
    '#d9ff00': t.colorNeon,
  }

  return colorMap[color] ?? color
}

function parsePriceFilter(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export function filterProducts(
  products,
  {
    gender = 'all',
    type = 'all',
    category = 'all',
    query = '',
    size = 'all',
    color = 'all',
    minPrice = '',
    maxPrice = '',
    onlyNew = false,
    onlySale = false,
    onlyInStock = false,
    sort = 'newest',
  },
) {
  const normalizedQuery = query.trim().toLowerCase()
  const parsedMinPrice = parsePriceFilter(minPrice)
  const parsedMaxPrice = parsePriceFilter(maxPrice)
  const lowerPrice =
    parsedMinPrice !== null && parsedMaxPrice !== null
      ? Math.min(parsedMinPrice, parsedMaxPrice)
      : parsedMinPrice
  const upperPrice =
    parsedMinPrice !== null && parsedMaxPrice !== null
      ? Math.max(parsedMinPrice, parsedMaxPrice)
      : parsedMaxPrice

  const filtered = products.filter((product) => {
    const genderMatch = gender === 'all' || product.gender.includes(gender)
    const typeMatch = type === 'all' || product.type === type
    const categoryMatch = category === 'all' || product.category === category
    const sizeMatch =
      size === 'all' ||
      product.sizes?.some((item) => String(item.size) === String(size) && item.inStock)
    const colorMatch = color === 'all' || product.colors?.includes(color)
    const minPriceMatch = lowerPrice === null || product.price >= lowerPrice
    const maxPriceMatch = upperPrice === null || product.price <= upperPrice
    const newMatch = !onlyNew || product.isNew
    const saleMatch = !onlySale || product.discountPercent > 0
    const stockMatch = !onlyInStock || product.inStock

    const baseMatch =
      genderMatch &&
      typeMatch &&
      categoryMatch &&
      sizeMatch &&
      colorMatch &&
      minPriceMatch &&
      maxPriceMatch &&
      newMatch &&
      saleMatch &&
      stockMatch

    if (!normalizedQuery) {
      return baseMatch
    }

    return (
      baseMatch &&
      [product.name_uz, product.name_ru, product.category, product.type]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  })

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.price - b.price || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'price-desc':
        return b.price - a.price || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'discount':
        return (b.discountPercent || 0) - (a.discountPercent || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })
}
