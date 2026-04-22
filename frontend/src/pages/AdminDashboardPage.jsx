import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../utils/adminApi'

function formatDate(value) {
  if (!value) return 'Никогда'
  return new Date(value).toLocaleString()
}

export function AdminDashboardPage() {
  const [status, setStatus] = useState(null)
  const [syncing, setSyncing] = useState('')
  const [message, setMessage] = useState('')

  async function loadStatus() {
    const response = await adminApi.get('/billz/sync/status')
    setStatus(response.data)
  }

  async function runAction(kind, endpoint, label) {
    setSyncing(kind)
    setMessage('')
    try {
      const response = await adminApi.post(endpoint)
      const created = response.data.created_count ?? response.data.created ?? 0
      const updated = response.data.updated_count ?? response.data.updated ?? 0
      const fetched = response.data.fetched_count ?? response.data.fetched ?? 0
      const hidden = response.data.marked_inactive ?? 0
      setMessage(`${label}: получено ${fetched}, добавлено ${created}, обновлено ${updated}, скрыто ${hidden}.`)
      await loadStatus()
    } catch (err) {
      const detail = err.response?.data?.detail
      setMessage(typeof detail === 'string' ? detail : `${label}: ошибка`)
      await loadStatus().catch(() => {})
    } finally {
      setSyncing('')
    }
  }

  useEffect(() => {
    loadStatus().catch(() => setStatus(null))
  }, [])

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">Панель</p>
            <h1 className="mt-2 text-3xl font-semibold">Управление синхронизацией BILLZ</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/55">
              Импортируйте товары из BILLZ, затем редактируйте названия, изображения и описания для сайта.
            </p>
          </div>
          <Link
            to="/admin/imported-products"
            className="w-fit rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white"
          >
            Открыть товары
          </Link>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard label="Последняя полная синхронизация" value={formatDate(status?.last_full_sync_at)} />
          <StatusCard label="Последнее обновление остатков" value={formatDate(status?.last_stock_sync_at)} />
          <StatusCard label="Последний статус" value={status?.last_sync_status || 'Неизвестно'} />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard label="Текущий курсор" value={status?.last_offset ?? 0} />
          <StatusCard label="Размер пакета" value={status?.batch_size ?? 200} />
          <StatusCard label="Есть еще" value={status?.has_more ? 'Да' : 'Нет'} />
        </section>

        <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Синхронизация</h2>
              <p className="mt-1 text-sm text-black/55">
                Импортируйте товары BILLZ пакетами по 200. Скрывайте отсутствующие только после завершения всех пакетов.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runAction('next-batch', '/billz/sync/next-batch', 'Следующие 200')}
                disabled={Boolean(syncing)}
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {syncing === 'next-batch' ? 'Синхронизируем 200...' : 'Синхронизировать следующие 200'}
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
          {message ? <p className="mt-4 text-sm text-[#b42318]">{message}</p> : null}
          {status?.last_sync_message ? <p className="mt-3 text-sm text-black/55">{status.last_sync_message}</p> : null}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard label="Добавлено" value={status?.products_created ?? 0} />
          <StatusCard label="Обновлено" value={status?.products_updated ?? 0} />
          <StatusCard label="Скрыто" value={status?.products_marked_inactive ?? 0} />
        </section>
      </div>
    </main>
  )
}

function StatusCard({ label, value }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">{label}</p>
      <p className="mt-3 break-words text-xl font-semibold">{value}</p>
    </div>
  )
}
