import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { clearAdminToken, getAdminToken } from '../../utils/adminApi'

const navItems = [
  { to: '/admin/dashboard', label: 'Панель' },
  { to: '/admin/imported-products', label: 'Импортированные товары' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const token = getAdminToken()

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  function logout() {
    clearAdminToken()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-[#161616]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-black/10 bg-white px-5 py-6 lg:block">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">KED UZ</p>
          <h1 className="mt-2 text-2xl font-semibold">Админ</h1>
        </div>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-black text-white' : 'text-black/65 hover:bg-black/[0.05] hover:text-black'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto lg:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-black text-white' : 'text-black/65'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="hidden text-sm text-black/55 lg:block">Админ гибридного каталога BILLZ</div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white"
            >
              Выйти
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
