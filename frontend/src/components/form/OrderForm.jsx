import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCheckCircle, FiX } from 'react-icons/fi'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'
import { formatPrice } from '../../utils/formatters'

export function OrderForm({ items = [], onSuccess }) {
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const [formData, setFormData] = useState({ name: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  )

  const isReady =
    items.length > 0 && formData.name.trim() && formData.phone.replace(/\D/g, '')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!items.length) {
      nextErrors.items = t.cartEmpty
    }
    if (!formData.name.trim()) {
      nextErrors.name = t.nameRequired
    }
    if (!formData.phone.replace(/\D/g, '')) {
      nextErrors.phone = t.phoneRequired
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      return
    }

    setIsSubmitting(true)

    // Future backend integration: submit order request payload to admin/API service here.
    await new Promise((resolve) => window.setTimeout(resolve, 1200))

    setIsSubmitting(false)
    setShowSuccess(true)
    setFormData({ name: '', phone: '' })
    onSuccess?.()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="rounded-[24px] border border-black/6 bg-white p-6 shadow-[0_18px_44px_rgba(15,15,16,0.05)] sm:p-8">
        <h3 className="text-xl font-extrabold text-black">{t.orderTitle}</h3>
        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t.fullName}
            className="w-full rounded-full border border-black/8 bg-white px-5 py-3.5 text-sm outline-none transition-colors focus:border-black"
          />
          {errors.name ? <p className="text-xs font-semibold text-[#ff3b30]">{errors.name}</p> : null}

          <input
            type="tel"
            value={formData.phone}
            onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Telefon raqamingiz"
            className="w-full rounded-full border border-black/8 bg-white px-5 py-3.5 text-sm outline-none transition-colors focus:border-black"
          />
          {errors.phone ? <p className="text-xs font-semibold text-[#ff3b30]">{errors.phone}</p> : null}

          <div className="rounded-[24px] bg-[#f7f5f2] p-4 text-sm text-zinc-600">
            <p className="text-[11px] font-bold uppercase text-zinc-400">
              {language === 'uz' ? 'Buyurtma xulosasi' : 'Детали заказа'}
            </p>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-black">{item.product[`name_${language}`]}</p>
                    <p className="text-xs text-zinc-500">
                      {item.size ? `${t.sizeLabel}: ${item.size}` : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-black">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/6 pt-4 font-bold text-black">
              <span>{t.total}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {errors.items ? <p className="text-xs font-semibold text-[#ff3b30]">{errors.items}</p> : null}

          <motion.button
            type="submit"
            whileTap={{ scale: isSubmitting || !isReady ? 1 : 0.98 }}
            disabled={isSubmitting || !isReady}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[#ff3b30] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,59,48,0.22)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
            {isSubmitting ? t.submitting : t.submit}
          </motion.button>

          <p className="text-xs text-zinc-500">{t.operatorNote}</p>
        </div>
      </form>

      <AnimatePresence>
        {showSuccess ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
            onClick={() => setShowSuccess(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_32px_80px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#fff2f1] text-[#ff3b30]">
                  <FiCheckCircle size={24} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuccess(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-black/10"
                >
                  <FiX size={18} />
                </button>
              </div>
              <h3 className="mt-6 text-2xl font-extrabold text-black">
                {t.successTitle} ✅
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{t.successMessage}</p>
              <p className="mt-2 text-xs text-zinc-500">{t.successSubtext}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
