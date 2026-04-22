import { motion } from 'framer-motion'
import { editorials } from '../../data/catalogData'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'

export function EditorialShowcase() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="mx-auto max-w-[1440px] px-3 pt-8 sm:px-6 lg:px-10"
    >
      <div className="mb-5 max-w-2xl sm:mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ff3b30]">
          {t.editorialEyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.06em] text-black sm:text-4xl">
          {t.editorialTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
          {t.editorialSubtitle}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
        {editorials.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="group relative overflow-hidden rounded-[28px] bg-black shadow-[0_20px_50px_rgba(15,15,16,0.14)]"
          >
            <img
              src={item.image}
              alt={item[`title_${language}`]}
              className="h-[260px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:h-[320px]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
            <div className="absolute inset-0 flex items-end p-5 sm:p-8">
              <div className="max-w-lg">
                <h3 className="text-2xl font-extrabold tracking-[-0.05em] text-[#f5f5f5] sm:text-3xl">
                  {item[`title_${language}`]}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/78 sm:text-base">
                  {item[`description_${language}`]}
                </p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  )
}
