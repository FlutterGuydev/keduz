import { PageSection } from '../components/common/PageSection'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'

export function DeliveryPage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-10">
      <PageSection title={t.deliveryTitle} description={t.deliverySubtitle}>
        <div className="grid gap-5 lg:grid-cols-3">
          {[t.deliveryStepOne, t.deliveryStepTwo, t.deliveryStepThree].map((step, index) => (
            <div key={step} className="rounded-[32px] border border-black/6 bg-white p-6 shadow-[0_18px_40px_rgba(15,15,16,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff3b30]">0{index + 1}</p>
              <p className="mt-4 text-sm leading-7 text-zinc-600">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[32px] bg-[#f7f5f2] p-6 text-sm leading-7 text-zinc-600">
          {t.returnsInfo}
        </div>
      </PageSection>
    </div>
  )
}
