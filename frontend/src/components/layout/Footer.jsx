import { FiFacebook, FiInstagram, FiSend } from 'react-icons/fi'
import logoImage from '../../assets/logo/ked-logo-light.png'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'

const socialLinks = [
  { icon: FiInstagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: FiSend, label: 'Telegram', href: 'https://t.me' },
  { icon: FiFacebook, label: 'Facebook', href: 'https://facebook.com' },
]

export function Footer() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <footer className="mt-16 border-t border-black/6 bg-[#111111] text-white lg:mt-20">
      <div className="mx-auto grid max-w-[1560px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-10 lg:py-16 xl:px-14">
        <div className="max-w-sm">
          <div className="ked-logo-mark">
            <img src={logoImage} alt="KED UZ" />
          </div>
          <p className="mt-5 text-sm leading-7 text-white/62">{t.footerLead}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.contacts}</h3>
          <p className="mt-4 text-sm text-white/62">+998 90 123 45 67</p>
          <p className="mt-2 text-sm text-white/62">+998 97 765 43 21</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.addresses}</h3>
          <p className="mt-4 text-sm text-white/62">{t.addressOne}</p>
          <p className="mt-2 text-sm text-white/62">{t.addressTwo}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{t.social}</h3>
          <div className="mt-4 flex gap-3">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-white/70 transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white hover:text-black"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1560px] border-t border-white/10 px-4 py-5 text-xs text-white/42 sm:px-6 lg:px-10 xl:px-14">
        {t.rights}
      </div>
    </footer>
  )
}
