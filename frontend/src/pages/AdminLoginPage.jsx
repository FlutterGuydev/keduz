import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAdminToken, loginAdmin } from '../utils/adminApi'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getAdminToken()) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAdmin(username, password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f4] px-5 py-12 text-[#161616]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(15,15,16,0.06)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">KED UZ admin</p>
        <h1 className="mt-3 text-3xl font-semibold">Вход</h1>
        <p className="mt-2 text-sm text-black/55">Управление импортированными товарами BILLZ и контентом сайта.</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Логин
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2 outline-none focus:border-black"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2 outline-none focus:border-black"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </div>
      </form>
    </main>
  )
}
