import { PageSection } from '../components/common/PageSection'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'

export function AboutPage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-10">
      <PageSection title={t.aboutTitle} description={t.aboutSubtitle}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-black/6 bg-white p-8 shadow-[0_18px_40px_rgba(15,15,16,0.05)]">
            <p className="text-sm leading-8 text-zinc-600">{t.aboutParagraphOne}</p>
            <p className="mt-5 text-sm leading-8 text-zinc-600">{t.aboutParagraphTwo}</p>
          </div>
          <div className="rounded-[32px] bg-[#f3efe9] p-8">
            <h3 className="text-2xl font-extrabold tracking-[-0.04em] text-black">KED UZ</h3>
            <p className="mt-4 text-sm leading-8 text-zinc-600">
              Fashion-store strukturasiga mos frontend arxitektura orqali katalog, yangi mahsulotlar, sevimlilar va buyurtma so‘rovlari keyingi bosqichdagi admin va backend integratsiyaga tayyor holga keltirilgan.
            </p>
          </div>
        </div>
      </PageSection>
    </div>
  )
}
