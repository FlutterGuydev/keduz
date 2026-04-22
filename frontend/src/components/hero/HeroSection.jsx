import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { heroSlides } from '../../data/catalogData'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'

export function HeroSection() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const slides = useMemo(() => heroSlides, [])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 4800)

    return () => window.clearInterval(timer)
  }, [slides.length])

  const activeSlide = slides[activeIndex]
  const title = activeSlide[`title_${language}`]

  return (
    <section className="relative bg-[#111111]">
      <div className="relative overflow-hidden bg-[#111111]">
        <div className="relative h-[80vh] min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]">
          <AnimatePresence initial={false}>
            <motion.img
              key={activeSlide.image}
              src={activeSlide.image}
              alt={activeSlide[`title_${language}`]}
              initial={{ opacity: 0, scale: 1.035 }}
              animate={{ opacity: 1, scale: [1.02, 1.055] }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.35, ease: 'easeInOut' }, scale: { duration: 5.4, ease: 'easeOut' } }}
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{ objectPosition: activeSlide.focalPoint || 'center center' }}
            />
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/58 to-black/20 sm:from-black/78 sm:via-black/32 sm:to-black/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-black/28 sm:from-black/50 sm:via-transparent sm:to-black/16" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_76%,rgba(0,0,0,0.55),transparent_34%),linear-gradient(110deg,rgba(255,255,255,0.08),transparent_34%,rgba(255,255,255,0.04)_72%,transparent)]" />

          <div className="relative z-10 mx-auto flex h-full max-w-[1560px] items-end px-5 pb-[12vh] pt-8 sm:px-8 lg:items-center lg:px-14 lg:pb-0 xl:px-20">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={activeSlide.id + language}
                initial={{ opacity: 0.96, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                className="w-full max-w-[330px] sm:max-w-[520px] lg:max-w-[650px]"
              >
                <p className="mb-3 inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/86 backdrop-blur">
                  KED UZ
                </p>
                <h1 className="max-w-[11ch] text-[2.3rem] font-extrabold leading-[1.02] text-[#f7f3ec] drop-shadow-[0_12px_32px_rgba(0,0,0,0.54)] [text-wrap:balance] sm:max-w-[12ch] sm:text-[3.6rem] lg:max-w-[13ch] lg:text-[5rem] xl:text-[5.7rem]">
                  {title}
                </h1>
                <p className="mt-3 max-w-[310px] text-sm leading-6 text-white/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.34)] sm:mt-4 sm:max-w-[520px] sm:text-[15px] sm:leading-7 lg:mt-5 lg:text-base">
                  {activeSlide[`subtitle_${language}`]}
                </p>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.14, ease: 'easeOut' }}
                  className="mt-5 sm:mt-7"
                >
                  <Link
                    to={activeSlide.ctaTo || '/catalog'}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-none bg-white px-7 py-3.5 text-sm font-extrabold text-black shadow-[0_18px_42px_rgba(0,0,0,0.32)] ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f7f3ec] hover:shadow-[0_22px_56px_rgba(0,0,0,0.28)] sm:w-auto"
                  >
                    {t.heroCta}
                  </Link>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-6 left-5 z-20 flex gap-2 sm:bottom-8 sm:left-8 lg:right-12 lg:left-auto">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  activeIndex === index ? 'w-11 bg-white shadow-[0_0_18px_rgba(255,255,255,0.36)]' : 'w-6 bg-white/38 hover:bg-white/62'
                }`}
                aria-label={slide.id}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
