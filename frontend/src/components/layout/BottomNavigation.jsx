import { NavLink } from 'react-router-dom'
import { FiGrid, FiHeart, FiHome, FiShoppingBag } from 'react-icons/fi'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'

export function BottomNavigation() {
  const language = useShopStore((state) => state.language)
  const favorites = useShopStore((state) => state.favorites)
  const cartItems = useShopStore((state) => state.cartItems)
  const t = translations[language]

  const items = [
    { to: '/', label: t.bottomHome, icon: FiHome, end: true },
    { to: '/catalog', label: t.bottomCatalog, icon: FiGrid },
    { to: '/favorites', label: t.bottomWishlist, icon: FiHeart, count: favorites.length },
    { to: '/cart', label: t.bottomCart, icon: FiShoppingBag, count: cartItems.length },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[22px] border border-black/8 bg-white/97 p-1.5 shadow-[0_-16px_38px_rgba(15,15,16,0.13)] backdrop-blur-2xl">
        {items.map(({ to, label, icon: Icon, count, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] text-[10px] font-bold transition-all ${
                isActive ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]' : 'text-zinc-500 active:bg-black/[0.06]'
              }`
            }
          >
            <span className="relative">
              <Icon size={21} strokeWidth={1.9} />
              {count ? (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3b30] px-1 text-[9px] font-bold leading-none text-white">
                  {count}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
