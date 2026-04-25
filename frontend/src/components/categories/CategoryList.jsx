import { Link } from 'react-router-dom'
import { translations } from '../../i18n/translations'
import { useShopStore } from '../../store/useShopStore'
import clothingImage from '../../assets/products/model-1.JPG'
import shoesImage from '../../assets/categories/model-9.JPG'

export function CategoryList() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const categories = [
    {
      id: 'clothing',
      to: '/catalog?type=clothing',
      image: clothingImage,
      title: t.navClothing,
      subtitle: language === 'uz'
        ? 'Model obrazlari, capsule essentials va kundalik premium fit.'
        : 'Образы, capsule essentials и премиальный повседневный fit.',
    },
    {
      id: 'shoes',
      to: '/catalog?type=shoe',
      image: shoesImage,
      title: t.navShoes,
      subtitle: language === 'uz'
        ? 'Sneakers, street klassika va yangi drop juftliklari.'
        : 'Sneakers, street-классика и новые drop-пары.',
    },
  ]

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            CATEGORY
          </p>
          <h2 className="mt-2 text-[1.8rem] font-extrabold leading-tight text-black sm:text-4xl lg:text-[2.65rem]">
            {t.homeCategoriesTitle}
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        {categories.map((category) => (
          <div key={category.id}>
            <Link
              to={category.to}
              className="group relative block overflow-hidden rounded-[24px] bg-[#111111] shadow-[0_18px_50px_rgba(15,15,16,0.08)] sm:rounded-[30px]"
            >
              <div className="relative h-[260px] sm:h-[360px] lg:h-[430px]">
                <img
                  src={category.image}
                  alt={category.title}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.045]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/62">
                    KED UZ
                  </p>
                  <h3 className="mt-2 text-3xl font-extrabold leading-none text-white sm:text-4xl">
                    {category.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/76">
                    {category.subtitle}
                  </p>
                  <span className="mt-5 inline-flex bg-white px-5 py-3 text-sm font-extrabold text-black transition-colors group-hover:bg-[#f4f1ea]">
                    {language === 'uz' ? 'Ko‘rish' : 'Смотреть'}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
