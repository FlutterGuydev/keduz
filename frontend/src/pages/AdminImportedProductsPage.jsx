import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, clearAdminToken, getAdminToken, loginAdmin } from '../utils/adminApi'

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAdmin(username, password)
      onLogin()
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f4] px-5 py-12 text-[#161616]">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-sm flex-col gap-4 rounded-lg border border-black/10 bg-white p-6 shadow-sm"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-black/50">KED UZ admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Вход</h1>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          Логин
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </main>
  )
}

function formatDate(value) {
  if (!value) return 'Никогда'
  return new Date(value).toLocaleString()
}

function getProductSize(product) {
  const title = product.billz_title || ''
  const slashParts = title.split('/').map((part) => part.trim()).filter(Boolean)
  if (slashParts.length > 1) {
    return slashParts.at(-1)
  }
  return product.size || product.size_summary || '-'
}

function StatusBadge({ active, children }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
      {children}
    </span>
  )
}

function getApiErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || String(item)).join('; ')
  if (detail && typeof detail === 'object') return detail.message || JSON.stringify(detail)
  return err?.response?.data?.error || err?.response?.data?.message || fallback
}

export function AdminImportedProductsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAdminToken()))
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: 20, total_pages: 0 })
  const [status, setStatus] = useState(null)
  const [search, setSearch] = useState('')
  const [onlyMissingImage, setOnlyMissingImage] = useState(false)
  const [onlyMissingDescription, setOnlyMissingDescription] = useState(false)
  const [publishFilter, setPublishFilter] = useState('')
  const [onlyActive, setOnlyActive] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState('')
  const [message, setMessage] = useState('')

  const params = useMemo(
    () => ({
      page: meta.page,
      page_size: pageSize,
      search: search || undefined,
      only_missing_image: onlyMissingImage || undefined,
      only_missing_description: onlyMissingDescription || undefined,
      only_published: publishFilter === '' ? undefined : publishFilter === 'published',
      only_active: onlyActive === '' ? undefined : onlyActive === 'true',
    }),
    [meta.page, onlyActive, onlyMissingDescription, onlyMissingImage, pageSize, publishFilter, search],
  )

  async function loadProducts(nextParams = params) {
    setLoading(true)
    try {
      const response = await adminApi.get('/admin/products/imported', { params: nextParams })
      setProducts(response.data.items)
      setMeta({
        total: response.data.total,
        page: response.data.page,
        page_size: response.data.page_size,
        total_pages: response.data.total_pages,
      })
    } catch (err) {
      if (err.response?.status === 401) {
        clearAdminToken()
        setIsAuthenticated(false)
      }
      setMessage(getApiErrorMessage(err, 'Не удалось загрузить импортированные товары'))
    } finally {
      setLoading(false)
    }
  }

  async function loadStatus() {
    try {
      const response = await adminApi.get('/billz/sync/status')
      setStatus(response.data)
    } catch {
      setStatus(null)
    }
  }

  async function runAction(kind, endpoint, label) {
    setSyncing(kind)
    setMessage('')
    try {
      const response = await adminApi.post(endpoint)
      const created = response.data.created_count ?? response.data.created ?? 0
      const updated = response.data.updated_count ?? response.data.updated ?? 0
      const fetched = response.data.fetched_count ?? response.data.fetched ?? 0
      const markedInactive = response.data.marked_inactive ?? 0
      if (response.data.success === false) {
        setMessage(`${label}: ошибка - ${response.data.error || response.data.message || 'неизвестная ошибка BILLZ'}`)
      } else {
        setMessage(`${label}: получено ${fetched}, добавлено ${created}, обновлено ${updated}, скрыто ${markedInactive}.`)
      }
      await loadStatus()
      await loadProducts({ ...params, page: 1 })
    } catch (err) {
      setMessage(getApiErrorMessage(err, `${label}: ошибка`))
    } finally {
      setSyncing('')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts()
      loadStatus()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <main className="min-h-screen bg-[#f6f6f4] px-4 py-8 text-[#161616] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-black/50">Гибридный каталог BILLZ</p>
            <h1 className="mt-2 text-3xl font-semibold">Импортированные товары</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/60">
              BILLZ управляет остатками, ценой и статусом. Изображения, описания и названия для сайта редактируются здесь.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAdminToken()
              setIsAuthenticated(false)
            }}
            className="w-fit rounded-md border border-black/15 px-4 py-2 text-sm"
          >
            Выйти
          </button>
        </header>

        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-1 text-sm text-black/65 sm:grid-cols-2 lg:grid-cols-4">
              <span>Полная синхронизация: {formatDate(status?.last_full_sync_at)}</span>
              <span>Остатки: {formatDate(status?.last_stock_sync_at)}</span>
              <span>Статус: {status?.last_sync_status || 'неизвестно'}</span>
              <span>Курсор: {status?.last_offset ?? 0}</span>
              <span>Пакет: {status?.batch_size ?? 200}</span>
              <span>Есть еще: {status?.has_more ? 'да' : 'нет'}</span>
              <span>Добавлено: {status?.products_created ?? 0}</span>
              <span>Обновлено: {status?.products_updated ?? 0}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runAction('next-batch', '/billz/sync/next-batch', 'Следующие 200')}
                disabled={Boolean(syncing)}
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {syncing === 'next-batch' ? 'Синхронизируем...' : 'Синхронизировать следующие 200'}
              </button>
              <button
                type="button"
                onClick={() => runAction('stock', '/billz/sync/stock', 'Обновление остатков')}
                disabled={Boolean(syncing)}
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {syncing === 'stock' ? 'Обновляем остатки...' : 'Обновить остатки'}
              </button>
              <button
                type="button"
                onClick={() => runAction('reset-cursor', '/billz/sync/reset-cursor', 'Сброс курсора')}
                disabled={Boolean(syncing)}
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {syncing === 'reset-cursor' ? 'Сбрасываем...' : 'Сбросить курсор'}
              </button>
              <button
                type="button"
                onClick={() => runAction('finalize-missing', '/billz/sync/finalize-missing', 'Скрытие отсутствующих')}
                disabled={Boolean(syncing)}
                className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {syncing === 'finalize-missing' ? 'Скрываем...' : 'Скрыть отсутствующие'}
              </button>
            </div>
          </div>
          {status?.last_sync_message ? <p className="mt-3 text-sm text-black/55">{status.last_sync_message}</p> : null}
          {message ? <p className="mt-3 text-sm text-[#b42318]">{message}</p> : null}
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_180px_180px_140px_auto] lg:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm">
            Поиск
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по артикулу, SKU, названию BILLZ или названию на сайте"
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            BILLZ статус
            <select
              value={onlyActive}
              onChange={(event) => setOnlyActive(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            >
              <option value="">Все</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Публикация
            <select
              value={publishFilter}
              onChange={(event) => setPublishFilter(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            >
              <option value="">Все</option>
              <option value="published">Только опубликованные</option>
              <option value="unpublished">Только не опубликованные</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            На странице
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-md border border-black/15 px-3 py-2"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => loadProducts({ ...params, page: 1 })}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Применить
          </button>
          <div className="flex flex-wrap gap-2 lg:col-span-5">
            <label className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={onlyMissingImage}
                onChange={(event) => setOnlyMissingImage(event.target.checked)}
              />
              Только без фото
            </label>
            <label className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={onlyMissingDescription}
                onChange={(event) => setOnlyMissingDescription(event.target.checked)}
              />
              Только без описания
            </label>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setOnlyActive('')
                setPublishFilter('')
                setOnlyMissingImage(false)
                setOnlyMissingDescription(false)
                setPageSize(20)
                loadProducts({ page: 1, page_size: 20 })
              }}
              className="rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-black/55 hover:text-black"
            >
              Сбросить фильтры
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-sm text-black/60">
            <span>{meta.total.toLocaleString()} товаров</span>
            <span>
              Страница {meta.page} из {meta.total_pages || 1}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.08em] text-black/55">
                <tr>
                  <th className="px-4 py-3">Товар</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Размер</th>
                  <th className="px-4 py-3">Итого остаток</th>
                  <th className="px-4 py-3">Цена</th>
                  <th className="px-4 py-3">Фото</th>
                  <th className="px-4 py-3">Описание</th>
                  <th className="px-4 py-3">Публикация</th>
                  <th className="px-4 py-3">Действие</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-black/10">
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${product.id}/edit`} className="font-semibold hover:underline">
                        {product.website_title_uz || product.billz_title || `Товар ${product.id}`}
                      </Link>
                      <p className="mt-1 max-w-md truncate text-xs text-black/55">{product.billz_title}</p>
                    </td>
                    <td className="px-4 py-3 text-black/65">{product.billz_sku || '-'}</td>
                    <td className="px-4 py-3 text-black/65">{getProductSize(product)}</td>
                    <td className="px-4 py-3">
                      {product.stock_quantity}
                      <span className="ml-2 text-xs text-black/45">{product.in_stock ? 'в наличии' : 'нет'}</span>
                    </td>
                    <td className="px-4 py-3">{Number(product.price).toLocaleString()} UZS</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={product.has_manual_image}>
                        {product.has_manual_image ? 'Есть фото' : 'Нет фото'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={product.has_manual_description}>
                        {product.has_manual_description ? 'Есть описание' : 'Нет описания'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={product.is_published}>
                        {product.is_published ? 'Опубликован' : 'Не опубликован'}
                      </StatusBadge>
                      <p className="mt-1 text-xs text-black/45">
                        BILLZ: {product.is_active ? 'активен' : 'неактивен'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="inline-flex rounded-md border border-black/15 px-3 py-2 text-xs font-semibold hover:bg-black hover:text-white"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}
                {!products.length && !loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-black/55" colSpan="9">
                      Товары не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 px-4 py-3">
            <button
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => loadProducts({ ...params, page: meta.page - 1 })}
              className="rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-40"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.total_pages || loading}
              onClick={() => loadProducts({ ...params, page: meta.page + 1 })}
              className="rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-40"
            >
              Вперед
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
