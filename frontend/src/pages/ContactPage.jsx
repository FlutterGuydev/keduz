import { FiExternalLink, FiMapPin, FiPhoneCall, FiSend } from 'react-icons/fi'
import { PageSection } from '../components/common/PageSection'
import { branches } from '../data/catalogData'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'

const PHONE = '+998 90 942 03 01'
const PHONE_URL = 'tel:+998909420301'
const TELEGRAM_URL = 'https://t.me/ked_uzz'
const INSTAGRAM_URL = 'https://instagram.com/ked_uzz'
const CHILONZOR_YANDEX_MAP_URL = 'https://yandex.uz/maps/org/67959157046?si=8u0qwhaj2jrevcq81qx54g1f04'
const YUNUSOBOD_YANDEX_MAP_URL = 'https://yandex.uz/maps/org/70716317495?si=8u0qwhaj2jrevcq81qx54g1f04'

const branchMapUrls = {
  chilonzor: CHILONZOR_YANDEX_MAP_URL,
  yunusobod: YUNUSOBOD_YANDEX_MAP_URL,
}

export function ContactPage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14 xl:px-14">
      <PageSection title={t.contactTitle} description={t.contactSubtitle} className="text-black">
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:gap-6">
          <div className="rounded-[20px] border border-black/6 bg-white p-5 shadow-[0_18px_44px_rgba(15,15,16,0.055)] sm:rounded-[24px] sm:p-8">
            <div className="space-y-4 text-sm leading-7 text-zinc-600">
              <div className="flex items-center gap-3 rounded-lg bg-black/[0.035] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black text-white">
                  <FiPhoneCall size={19} />
                </span>
                <span className="font-semibold text-black">{PHONE}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-black/[0.035] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black text-white">
                  <FiMapPin size={19} />
                </span>
                <span>Yunusobod | Chilonzor</span>
              </div>
              <p className="rounded-lg border border-black/6 px-4 py-3">10:00 – 22:00</p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={PHONE_URL}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                {t.callUs}
              </a>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white"
              >
                <FiSend size={16} />
                {t.writeTelegram}
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white"
              >
                Instagram
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <article
                key={branch.id}
                className="flex min-h-[280px] flex-col rounded-[20px] border border-black/6 bg-white p-5 shadow-[0_18px_40px_rgba(15,15,16,0.045)] sm:rounded-[24px] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-black text-white">
                    <FiMapPin size={19} />
                  </div>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-bold text-zinc-500">
                    {branch[`hours_${language}`]}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-black sm:text-xl">{branch[`name_${language}`]}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{branch[`address_${language}`]}</p>
                <p className="mt-4 text-sm font-semibold text-black">{PHONE}</p>

                <div className="mt-auto grid gap-2 pt-5">
                  <a
                    href={PHONE_URL}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff3b30]"
                  >
                    {t.callUs}
                  </a>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a
                      href={TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                    >
                      <FiSend size={15} />
                      {t.writeTelegram}
                    </a>
                    <a
                      href={branchMapUrls[branch.id] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                    >
                      <FiExternalLink size={15} />
                      Xaritada ochish
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </PageSection>
    </div>
  )
}
