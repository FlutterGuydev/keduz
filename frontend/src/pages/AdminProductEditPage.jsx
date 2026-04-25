import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, clearAdminToken } from '../utils/adminApi'
import { resolveImageUrl } from '../utils/imageUrl'

function fieldValue(value) {
  return value ?? ''
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value).toLocaleString()} UZS`
}

function formatDate(value) {
  if (!value) return 'Никогда'
  return new Date(value).toLocaleString()
}

function formatMovementItem(item) {
  if (!item || typeof item !== 'object') {
    return String(item || '-')
  }
  const date = item.date || item.created_at || item.updated_at || item.movement_date || item.time
  const type = item.type || item.operation || item.reason || item.status
  const quantity = item.quantity ?? item.qty ?? item.stock_quantity ?? item.measurement_value
  return [date, type, quantity !== undefined ? `кол-во: ${quantity}` : null].filter(Boolean).join(' / ') || JSON.stringify(item)
}

const SECTION_OPTIONS = [
  { slug: 'men', label: 'Erkaklar' },
  { slug: 'women', label: 'Ayollar' },
  { slug: 'unisex', label: 'Unisex' },
  { slug: 'clothing', label: 'Kiyimlar' },
  { slug: 'shoe', label: 'Poyabzal' },
  { slug: 'new', label: 'Yangi' },
]

function StatusPill({ active, children }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
      {children}
    </span>
  )
}

function Notice({ message }) {
  if (!message) return null
  const isSuccess = /(сохран|загруж|синхрониз)/i.test(message) && !/(не удалось|ошибка)/i.test(message)
  return (
    <p className={`mt-4 rounded-md px-3 py-2 text-sm ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-[#b42318]'}`}>
      {message}
    </p>
  )
}

function PreviewImage({ src, alt, className = '' }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center rounded-md bg-black/[0.04] text-sm text-black/45 ${className}`}>
        Нет изображения
      </div>
    )
  }

  return (
    <img
      src={resolveImageUrl(src)}
      alt={alt}
      className={`rounded-md object-cover ring-1 ring-black/10 ${className}`}
      onLoad={(event) => {
        event.currentTarget.style.display = 'block'
      }}
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  )
}

export function AdminProductEditPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [contentForm, setContentForm] = useState(null)
  const [statusForm, setStatusForm] = useState(null)
  const [coverImage, setCoverImage] = useState('')
  const [galleryImages, setGalleryImages] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [uploading, setUploading] = useState('')
  const [syncingMovements, setSyncingMovements] = useState(false)
  const [stockSummary, setStockSummary] = useState(null)
  const [movements, setMovements] = useState([])
  const [messages, setMessages] = useState({})

  const imported = product?.imported

  const importedRows = useMemo(() => {
    if (!imported) return []
    const sizes = product?.variants?.length
      ? product.variants.map((variant) => `${variant.size}: ${variant.total_stock ?? variant.stock_quantity}`).join(', ')
      : '-'
    return [
      ['Название BILLZ', imported.billz_title || '-'],
      ['SKU / артикул', imported.billz_sku || '-'],
      ['billz_id', imported.billz_id || '-'],
      ['Размеры / остаток', sizes],
      ['Цена', formatMoney(imported.price)],
      ['Старая цена', formatMoney(imported.old_price)],
      ['Итого остаток', imported.stock_quantity],
      ['Активен', imported.is_active ? 'да' : 'нет'],
      ['Последняя синхронизация', formatDate(imported.last_synced_at)],
    ]
  }, [imported, product?.variants])

  async function loadProduct() {
    setLoading(true)
    setMessages({})
    try {
      const response = await adminApi.get(`/admin/products/${id}`)
      const data = response.data
      setProduct(data)
      setContentForm({
        name_uz: fieldValue(data.website.name_uz),
        name_ru: fieldValue(data.website.name_ru),
        description_uz: fieldValue(data.website.description_uz),
        description_ru: fieldValue(data.website.description_ru),
        category_id: data.website.category_id ?? '',
        slug: fieldValue(data.website.slug),
        section_slugs: data.website.section_slugs || [],
      })
      setStatusForm({
        is_active: Boolean(data.imported.is_active),
        featured: Boolean(data.website.featured),
        show_in_banner: Boolean(data.website.show_in_banner),
        is_published: Boolean(data.website.is_published),
      })
      setCoverImage(fieldValue(data.website.cover_image))
      setGalleryImages(data.website.images?.map((image) => image.image_url) || [])
    } catch (err) {
      if (err.response?.status === 401) {
        clearAdminToken()
      }
      setMessages({ page: err.response?.data?.detail || 'Не удалось загрузить товар' })
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const response = await adminApi.get('/categories')
      setCategoryOptions(response.data || [])
    } catch {
      setCategoryOptions([])
    }
  }

  async function loadStockInfo() {
    try {
      const [summaryResponse, movementsResponse] = await Promise.all([
        adminApi.get(`/admin/products/${id}/stock-summary`),
        adminApi.get(`/admin/products/${id}/movements`, { params: { page: 1, page_size: 20 } }),
      ])
      setStockSummary(summaryResponse.data)
      setMovements(movementsResponse.data.items || [])
    } catch (err) {
      setMessages((current) => ({
        ...current,
        stock: err.response?.data?.detail || 'Не удалось загрузить движения остатков',
      }))
    }
  }

  useEffect(() => {
    loadCategories()
    loadProduct()
    loadStockInfo()
  }, [id])

  function updateContent(field, value) {
    setContentForm((current) => ({ ...current, [field]: value }))
  }

  function updateStatus(field, value) {
    setStatusForm((current) => ({ ...current, [field]: value }))
  }

  function toggleSection(slug) {
    setContentForm((current) => {
      const currentSections = current.section_slugs || []
      const section_slugs = currentSections.includes(slug)
        ? currentSections.filter((item) => item !== slug)
        : [...currentSections, slug]
      return { ...current, section_slugs }
    })
  }

  function removeGalleryImage(index) {
    setGalleryImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function uploadImageFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await adminApi.post('/admin/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.file_url
  }

  async function uploadCoverImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading('cover')
    setMessages({})
    try {
      const fileUrl = await uploadImageFile(file)
      setCoverImage(fileUrl)
      setMessages({ images: 'Обложка загружена. Нажмите "Сохранить изображения", чтобы привязать ее к товару.' })
    } catch (err) {
      setMessages({ images: err.response?.data?.detail || 'Не удалось загрузить обложку' })
    } finally {
      setUploading('')
      event.target.value = ''
    }
  }

  async function uploadGalleryImages(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading('gallery')
    setMessages({})
    try {
      const uploadedUrls = []
      for (const file of files) {
        uploadedUrls.push(await uploadImageFile(file))
      }
      setGalleryImages((current) => [...current, ...uploadedUrls])
      setMessages({ images: 'Изображения галереи загружены. Нажмите "Сохранить изображения", чтобы привязать их к товару.' })
    } catch (err) {
      setMessages({ images: err.response?.data?.detail || 'Не удалось загрузить изображения галереи' })
    } finally {
      setUploading('')
      event.target.value = ''
    }
  }

  async function saveContent(event) {
    event.preventDefault()
    setSaving('content')
    setMessages({})
    try {
      await adminApi.put(`/admin/products/${id}/content`, {
        name_uz: contentForm.name_uz,
        name_ru: contentForm.name_ru,
        description_uz: contentForm.description_uz || null,
        description_ru: contentForm.description_ru || null,
        category_id: contentForm.category_id === '' ? null : Number(contentForm.category_id),
        slug: contentForm.slug || null,
        section_slugs: contentForm.section_slugs || [],
      })
      await loadProduct()
      setMessages({ content: 'Контент сохранен.' })
    } catch (err) {
      setMessages({ content: err.response?.data?.detail || 'Не удалось сохранить контент' })
    } finally {
      setSaving('')
    }
  }

  async function saveImages(event) {
    event.preventDefault()
    setSaving('images')
    setMessages({})
    try {
      const images = galleryImages
        .map((imageUrl) => imageUrl.trim())
        .filter(Boolean)
        .map((image_url) => ({ image_url }))
      await adminApi.put(`/admin/products/${id}/images`, {
        cover_image: coverImage.trim() || null,
        images,
      })
      await loadProduct()
      setMessages({ images: 'Изображения сохранены.' })
    } catch (err) {
      setMessages({ images: err.response?.data?.detail || 'Не удалось сохранить изображения' })
    } finally {
      setSaving('')
    }
  }

  async function saveStatus(event) {
    event.preventDefault()
    setSaving('status')
    setMessages({})
    try {
      await adminApi.put(`/admin/products/${id}/status`, statusForm)
      await loadProduct()
      setMessages({ status: 'Статус сохранен.' })
    } catch (err) {
      setMessages({ status: err.response?.data?.detail || 'Не удалось сохранить статус' })
    } finally {
      setSaving('')
    }
  }

  async function syncMovements() {
    setSyncingMovements(true)
    setMessages({})
    try {
      const response = await adminApi.post('/billz/sync/movements')
      const created = response.data.created ?? 0
      const fetched = response.data.fetched ?? 0
      const skipped = response.data.skipped ?? 0
      await loadProduct()
      await loadStockInfo()
      if (response.data.success === false) {
        setMessages({ stock: response.data.error || 'Не удалось синхронизировать движения' })
      } else {
        setMessages({ stock: `Движения синхронизированы: получено ${fetched}, добавлено ${created}, пропущено ${skipped}.` })
      }
    } catch (err) {
      setMessages({ stock: err.response?.data?.detail || 'Не удалось синхронизировать движения' })
    } finally {
      setSyncingMovements(false)
    }
  }

  if (loading) {
    return <main className="px-4 py-8 text-[#161616] sm:px-6 lg:px-8">Загрузка товара...</main>
  }

  if (!product || !contentForm || !statusForm) {
    return (
      <main className="px-4 py-8 text-[#161616] sm:px-6 lg:px-8">
        <p>{messages.page || 'Товар не найден.'}</p>
        <Link to="/admin/imported-products" className="mt-4 inline-flex underline">
          Назад к товарам
        </Link>
      </main>
    )
  }

  return (
    <main className="px-4 py-8 text-[#161616] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link to="/admin/imported-products" className="inline-flex rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-black/65 hover:bg-black hover:text-white">
              Назад к товарам
            </Link>
            <h1 className="mt-3 text-3xl font-semibold">Редактирование товара для сайта</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/60">
              BILLZ обновляет остатки и цены. Контент, изображения и публикация управляются в админке KED UZ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill active={imported?.is_active}>BILLZ: {imported?.is_active ? 'активен' : 'неактивен'}</StatusPill>
            <StatusPill active={statusForm.is_published}>{statusForm.is_published ? 'Опубликован' : 'Черновик'}</StatusPill>
            <StatusPill active={Boolean(coverImage)}>Изображение: {coverImage ? 'готово' : 'нет'}</StatusPill>
          </div>
        </header>

        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Импортировано из BILLZ</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {importedRows.map(([label, value]) => (
              <div key={label} className="rounded-md border border-black/10 bg-black/[0.02] p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">{label}</dt>
                <dd className="mt-2 break-words text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={saveContent} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Контент для сайта</h2>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  Название UZ
                  <input
                    value={contentForm.name_uz}
                    onChange={(event) => updateContent('name_uz', event.target.value)}
                    className="rounded-md border border-black/15 px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Название RU
                  <input
                    value={contentForm.name_ru}
                    onChange={(event) => updateContent('name_ru', event.target.value)}
                    className="rounded-md border border-black/15 px-3 py-2"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm">
                Описание UZ
                <textarea
                  rows="6"
                  value={contentForm.description_uz}
                  onChange={(event) => updateContent('description_uz', event.target.value)}
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Описание RU
                <textarea
                  rows="6"
                  value={contentForm.description_ru}
                  onChange={(event) => updateContent('description_ru', event.target.value)}
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  Слаг
                  <input
                    value={contentForm.slug}
                    onChange={(event) => updateContent('slug', event.target.value)}
                    className="rounded-md border border-black/15 px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Kategoriya
                  <select
                    value={contentForm.category_id}
                    onChange={(event) => updateContent('category_id', event.target.value)}
                    className="rounded-md border border-black/15 bg-white px-3 py-2"
                  >
                    <option value="">Kategoriya tanlanmagan</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_uz || category.name_ru} ({category.slug})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="rounded-md border border-black/10 bg-black/[0.02] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Saytdagi bo'limlar</h3>
                    <p className="mt-1 text-xs leading-5 text-black/50">
                      Bir mahsulot bir nechta bo'limda ko'rinishi mumkin. Yangi asosiy bo'limlarni almashtirmaydi.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(contentForm.section_slugs || []).map((slug) => {
                      const section = SECTION_OPTIONS.find((item) => item.slug === slug)
                      return (
                        <span key={slug} className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white">
                          {section?.label || slug}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SECTION_OPTIONS.map((section) => (
                    <label key={section.slug} className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
                      <span>
                        <span className="block font-semibold">{section.label}</span>
                        <span className="text-xs text-black/45">{section.slug === 'new' ? "Qo'shimcha bo'lim" : 'Storefront filtri'}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={(contentForm.section_slugs || []).includes(section.slug)}
                        onChange={() => toggleSection(section.slug)}
                        className="h-5 w-5 accent-black"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <Notice message={messages.content} />
            <button
              type="submit"
              disabled={saving === 'content'}
              className="mt-5 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving === 'content' ? 'Сохраняем контент...' : 'Сохранить контент'}
            </button>
          </form>

          <form onSubmit={saveStatus} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
            <h2 className="text-xl font-semibold">Статус на сайте</h2>
            <p className="mt-2 text-sm text-black/55">
              Для показа на сайте товар должен быть активен и опубликован.
            </p>
            <div className="mt-5 grid gap-3 text-sm">
              {[
                ['is_active', 'Доступен к продаже'],
                ['is_published', 'Опубликован на сайте'],
                ['featured', 'Рекомендуемый'],
                ['show_in_banner', 'Показывать в баннере'],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center justify-between gap-4 rounded-md border border-black/10 px-3 py-3">
                  <span>
                    <span className="block font-semibold">{field}</span>
                    <span className="text-xs text-black/50">{label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(statusForm[field])}
                    onChange={(event) => updateStatus(field, event.target.checked)}
                    className="h-5 w-5 accent-black"
                  />
                </label>
              ))}
            </div>
            <Notice message={messages.status} />
            <button
              type="submit"
              disabled={saving === 'status'}
              className="mt-5 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving === 'status' ? 'Сохраняем статус...' : 'Сохранить статус'}
            </button>
          </form>
        </section>

        <form onSubmit={saveImages} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Изображения для сайта</h2>
              <p className="mt-1 text-sm text-black/55">
                Загрузите изображения с компьютера. Ранее сохраненные изображения останутся видимыми и их можно удалить из галереи.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="w-fit cursor-pointer rounded-md border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white">
                {uploading === 'gallery' ? 'Загружаем...' : 'Загрузить изображения галереи'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={Boolean(uploading)}
                  onChange={uploadGalleryImages}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <div className="grid gap-2 text-sm">
                <span>Обложка</span>
                <label className="flex cursor-pointer items-center justify-center rounded-md border border-black/15 px-4 py-3 text-sm font-semibold hover:bg-black hover:text-white">
                  {uploading === 'cover' ? 'Загружаем...' : 'Загрузить обложку'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(uploading)}
                    onChange={uploadCoverImage}
                    className="hidden"
                  />
                </label>
                {coverImage ? (
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold"
                  >
                    Удалить обложку
                  </button>
                ) : null}
              </div>
              <PreviewImage src={coverImage} alt="Предпросмотр обложки" className="mt-3 aspect-square w-full" />
            </div>

            <div className="grid gap-4">
              {galleryImages.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="grid gap-3 rounded-md border border-black/10 p-3 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
                  <PreviewImage src={imageUrl} alt={`Предпросмотр галереи ${index + 1}`} className="aspect-square w-full md:w-[120px]" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">Изображение галереи {index + 1}</p>
                    <p className="mt-1 truncate text-xs text-black/45">{imageUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="rounded-md border border-black/15 px-3 py-2 text-sm font-semibold"
                  >
                    Удалить
                  </button>
                </div>
              ))}
              {!galleryImages.length ? (
                <div className="rounded-md border border-dashed border-black/15 p-8 text-center text-sm text-black/45">
                  Изображений в галерее пока нет.
                </div>
              ) : null}
            </div>
          </div>

          <Notice message={messages.images} />
          <button
            type="submit"
            disabled={saving === 'images'}
            className="mt-5 rounded-md bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving === 'images' ? 'Сохраняем изображения...' : 'Сохранить изображения'}
          </button>
        </form>

        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Остатки и движения</h2>
              <p className="mt-1 text-sm text-black/55">
                Остатки считаются по движениям BILLZ. Продажи уменьшают остаток, приходы и возвраты увеличивают.
              </p>
            </div>
            <button
              type="button"
              onClick={syncMovements}
              disabled={syncingMovements}
              className="w-fit rounded-md bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {syncingMovements ? 'Синхронизируем движения...' : 'Синхронизировать движения'}
            </button>
          </div>

          <Notice message={messages.stock} />

          <div className="mt-5 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-md border border-black/10 bg-black/[0.02] p-4">
              <h3 className="font-semibold">Остатки по магазинам</h3>
              <div className="mt-4 grid gap-2 text-sm">
                {stockSummary?.stores?.length ? (
                  stockSummary.stores.map((store) => (
                    <div key={store.store_name} className="flex justify-between gap-3 border-b border-black/10 pb-2">
                      <span className="text-black/60">{store.store_name}</span>
                      <span className="font-semibold">{store.stock_quantity}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-black/45">Движений пока нет. Используется остаток из синхронизации товара.</p>
                )}
                <div className="flex justify-between gap-3 pt-2 text-base">
                  <span className="font-semibold">Итого</span>
                  <span className="font-semibold">{stockSummary?.total_stock ?? imported?.stock_quantity ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.08em] text-black/50">
                  <tr>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Движение</th>
                    <th className="px-4 py-3">Количество</th>
                    <th className="px-4 py-3">Магазин</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-black/10">
                      <td className="px-4 py-3">{formatDate(movement.movement_date)}</td>
                      <td className="px-4 py-3 font-semibold">{movement.movement_type}</td>
                      <td className={movement.signed_quantity >= 0 ? 'px-4 py-3 text-green-700' : 'px-4 py-3 text-red-700'}>
                        {movement.signed_quantity > 0 ? '+' : ''}
                        {movement.signed_quantity}
                      </td>
                      <td className="px-4 py-3 text-black/60">{movement.store_name || '-'}</td>
                    </tr>
                  ))}
                  {!movements.length ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-black/45" colSpan="4">
                        Движений по товару пока нет.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Варианты BILLZ</h2>
              <p className="mt-1 text-sm text-black/55">Размеры, остатки по магазинам, общий остаток, SKU и цены доступны только для просмотра.</p>
            </div>
            <span className="text-sm text-black/45">{product.variants?.length || 0} вариантов</span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.08em] text-black/50">
                <tr>
                  <th className="px-4 py-3">Размер</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Остатки по магазинам</th>
                  <th className="px-4 py-3">Итого</th>
                  <th className="px-4 py-3">Цена</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">История</th>
                </tr>
              </thead>
              <tbody>
                {(product.variants || []).map((variant) => (
                  <tr key={variant.id} className="border-t border-black/10">
                    <td className="px-4 py-3 font-semibold">{variant.size}</td>
                    <td className="px-4 py-3 text-black/60">{variant.sku || '-'}</td>
                    <td className="px-4 py-3">
                      {variant.stock_by_store?.length ? (
                        <div className="grid gap-1">
                          {variant.stock_by_store.map((store, index) => (
                            <div key={`${store.store_name}-${index}`} className="flex min-w-[180px] justify-between gap-3 text-xs">
                              <span className="text-black/55">{store.store_name || `Магазин ${index + 1}`}</span>
                              <span className="font-semibold">{store.stock_quantity ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-black/40">Нет данных</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{variant.total_stock ?? variant.stock_quantity}</td>
                    <td className="px-4 py-3">{formatMoney(variant.price)}</td>
                    <td className="px-4 py-3">
                      <span className={(variant.total_stock ?? variant.stock_quantity) > 0 ? 'text-green-700' : 'text-red-700'}>
                        {(variant.total_stock ?? variant.stock_quantity) > 0 ? 'В наличии' : 'Нет в наличии'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {variant.movement_history?.length ? (
                        <div className="grid max-w-[260px] gap-1 text-xs text-black/60">
                          {variant.movement_history.slice(0, 3).map((item, index) => (
                            <span key={index}>{formatMovementItem(item)}</span>
                          ))}
                          {variant.movement_history.length > 3 ? (
                            <span className="text-black/40">Еще {variant.movement_history.length - 3}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-black/40">Нет истории</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!product.variants?.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-black/45" colSpan="7">
                      Варианты BILLZ еще не синхронизированы.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
