import { useShopStore } from '../../store/useShopStore'

export function LanguageToggle({ minimal = false, tone = 'light' }) {
  const language = useShopStore((state) => state.language)
  const setLanguage = useShopStore((state) => state.setLanguage)
  const isDark = tone === 'dark'

  if (minimal) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase ${isDark ? 'text-white' : 'text-black'}`}>
        {['uz', 'ru'].map((lang, index) => (
          <div key={lang} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLanguage(lang)}
              className={`inline-flex h-9 min-w-8 items-center justify-center rounded-md px-2 transition-all duration-200 ${isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-black/[0.045] hover:text-black'} ${language === lang ? (isDark ? 'text-white' : 'text-black') : 'text-zinc-400'}`}
            >
              {lang}
            </button>
            {index === 0 ? <span className={isDark ? 'text-white/24' : 'text-zinc-300'}>/</span> : null}
          </div>
        ))}
      </div>
    )
  }

  return null
}
