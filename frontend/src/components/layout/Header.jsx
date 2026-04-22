import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiHeart, FiMenu, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'
import logoImage from '../../assets/logo/ked-logo-light.png'
import { LanguageToggle } from './LanguageToggle'

const navItems = [
  { labelKey: 'navMen', to: '/catalog?gender=men' },
  { labelKey: 'navWomen', to: '/catalog?gender=women' },
  { labelKey: 'navUnisex', to: '/catalog?gender=unisex' },
  { labelKey: 'navClothing', to: '/catalog?type=clothing' },
  { labelKey: 'navShoes', to: '/catalog?type=shoe' },
  { labelKey: 'navNew', to: '/new' },
  { labelKey: 'navContact', to: '/contact' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const language = useShopStore((state) => state.language)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const setSearchQuery = useShopStore((state) => state.setSearchQuery)
  const favorites = useShopStore((state) => state.favorites)
  const cartItems = useShopStore((state) => state.cartItems)
  const navigate = useNavigate()
  const location = useLocation()
  const t = translations[language]

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const openMobileMenu = () => setMobileMenuOpen(true)
    window.addEventListener('ked:open-mobile-menu', openMobileMenu)
    return () => window.removeEventListener('ked:open-mobile-menu', openMobileMenu)
  }, [])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    navigate('/catalog')
    setMobileMenuOpen(false)
  }

  const isNavActive = (to) => {
    const [path, search] = to.split('?')
    if (location.pathname !== path) return false
    if (!search) return true
    return location.search === `?${search}`
  }

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-[#0f0f10]/97 shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-2xl' : 'bg-[#111111]/97 backdrop-blur-xl'}`}>
      <div className={`relative mx-auto grid w-full max-w-[1560px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 px-3 transition-all duration-300 sm:px-5 lg:grid-cols-[190px_minmax(0,1fr)_220px] lg:gap-8 lg:px-10 xl:grid-cols-[220px_minmax(0,1fr)_250px] xl:px-12 ${isScrolled ? 'py-2.5 sm:py-3 lg:py-3' : 'py-3 sm:py-3.5 lg:py-4'}`}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.065] text-white ring-1 ring-white/12 transition-all duration-200 active:scale-95 lg:hidden"
          aria-label="menu"
        >
          {mobileMenuOpen ? <FiX size={22} strokeWidth={1.8} /> : <FiMenu size={22} strokeWidth={1.8} />}
        </button>

        <Link to="/" className={`ked-logo-mark absolute left-1/2 -translate-x-1/2 transition-all duration-300 lg:static lg:translate-x-0 lg:justify-self-start ${isScrolled ? 'is-compact' : ''}`} aria-label="KED UZ home">
          <img src={logoImage} alt="KED UZ" />
        </Link>

        <nav className="hidden items-center justify-center gap-6 lg:flex xl:gap-9">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`relative whitespace-nowrap pb-1 text-[15px] font-semibold transition-colors ${isNavActive(item.to) ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {t[item.labelKey]}
              <span className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${isNavActive(item.to) ? 'w-full bg-[#ff3b30]' : 'w-0 bg-transparent'}`} />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-3 lg:flex xl:gap-4">
          <button type="button" onClick={() => navigate('/catalog')} className="inline-flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white" aria-label={t.searchPlaceholder}>
            <FiSearch size={25} strokeWidth={1.8} />
          </button>
          <Link to="/favorites" className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white">
            <FiHeart size={25} strokeWidth={1.8} />
            {favorites.length ? <span className="absolute right-2 top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0f0f10]">{favorites.length}</span> : null}
          </Link>
          <Link to="/cart" className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:scale-[1.04] hover:bg-white/10 hover:text-white">
            <FiShoppingBag size={25} strokeWidth={1.8} />
            {cartItems.length ? <span className="absolute right-2 top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0f0f10]">{cartItems.length}</span> : null}
          </Link>
          <LanguageToggle minimal tone="dark" />
        </div>

        <div className="mobile-header-actions flex shrink-0 items-center justify-end gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.065] text-white ring-1 ring-white/12 transition-all duration-200 active:scale-95 sm:h-11 sm:w-11"
            aria-label={t.searchPlaceholder}
          >
            <FiSearch size={19} strokeWidth={1.8} />
          </button>
          <Link to="/favorites" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.065] text-white ring-1 ring-white/12 transition-all duration-200 active:scale-95 sm:h-11 sm:w-11" aria-label={t.favoritesTitle}>
            <FiHeart size={19} strokeWidth={1.8} />
            {favorites.length ? <span className="absolute right-0.5 top-0.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-[#ff3b30] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-[#0f0f10] sm:right-1 sm:top-1 sm:h-[15px] sm:min-w-[15px]">{favorites.length}</span> : null}
          </Link>
          <Link to="/cart" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.065] text-white ring-1 ring-white/12 transition-all duration-200 active:scale-95 sm:h-11 sm:w-11" aria-label={t.cartTitle}>
            <FiShoppingBag size={20} strokeWidth={1.8} />
            {cartItems.length ? <span className="absolute right-0.5 top-0.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-[#ff3b30] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-[#0f0f10] sm:right-1 sm:top-1 sm:h-[15px] sm:min-w-[15px]">{cartItems.length}</span> : null}
          </Link>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-white/10 bg-[#101011]/98 px-4 pb-6 pt-4 shadow-[0_20px_44px_rgba(0,0,0,0.28)] lg:hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <LanguageToggle minimal tone="dark" />
            <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <FiHeart size={20} strokeWidth={1.8} />
              {t.favoritesTitle}
            </Link>
          </div>
          <form onSubmit={handleSearchSubmit} className="mt-4 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3">
            <FiSearch className="text-zinc-400" size={19} strokeWidth={1.8} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </form>
          <div className="mt-4 flex flex-col gap-4">
            {navItems.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]">
                {t[item.labelKey]}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  )
}
