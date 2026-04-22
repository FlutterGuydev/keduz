import { FiMapPin, FiPhoneCall, FiSend } from 'react-icons/fi'
import { branches } from '../data/catalogData'
import { PageSection } from '../components/common/PageSection'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'

export function ContactPage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14 xl:px-14">
      <PageSection title={t.contactTitle} description={t.contactSubtitle} className="text-black">
        <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6">
          <div className="rounded-[22px] border border-black/6 bg-white p-6 shadow-[0_18px_44px_rgba(15,15,16,0.055)] sm:p-8">
            <div className="space-y-4 text-sm leading-7 text-zinc-600">
              <div className="flex items-center gap-3 rounded-lg bg-black/[0.035] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black text-white">
                  <FiPhoneCall size={19} />
                </span>
                <span className="font-semibold text-black">+998 90 123 45 67</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-black/[0.035] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black text-white">
                  <FiMapPin size={19} />
                </span>
                <span>{branches[0][`address_${language}`]}</span>
              </div>
              <p className="rounded-lg border border-black/6 px-4 py-3">{branches[0][`hours_${language}`]}</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="tel:+998901234567" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
                {t.callUs}
              </a>
              <a href="https://t.me" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white">
                <FiSend size={16} />
                {t.writeTelegram}
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((branch) => (
              <div key={branch.id} className="rounded-[22px] border border-black/6 bg-white p-5 shadow-[0_18px_40px_rgba(15,15,16,0.045)] sm:p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-black text-white">
                  <FiMapPin size={19} />
                </div>
                <h3 className="text-lg font-extrabold text-black sm:text-xl">{branch[`name_${language}`]}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{branch[`address_${language}`]}</p>
                <p className="mt-4 text-sm font-semibold text-black">{branch.phone}</p>
                <p className="mt-1 text-sm text-zinc-500">{branch[`hours_${language}`]}</p>
              </div>
            ))}
            <div className="rounded-[22px] border border-dashed border-black/10 bg-[linear-gradient(135deg,#ffffff,#f3f3f1)] p-5 sm:col-span-2 sm:p-6">
              <div className="flex min-h-[160px] flex-col justify-between rounded-[16px] border border-black/6 bg-white/72 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-400">{language === 'uz' ? 'Filiallar xaritasi' : 'Карта филиалов'}</p>
                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600">
                  {language === 'uz'
                    ? 'Eng yaqin filialni tanlash va marshrutni ko‘rish imkoniyati tez orada ishga tushadi.'
                    : 'Скоро здесь можно будет выбрать ближайший филиал и построить маршрут.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  )
}
