import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryList } from '../components/categories/CategoryList'
import { HeroSection } from '../components/hero/HeroSection'
import { ProductRail } from '../components/product/ProductRail'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { groupProductsByBaseName } from '../utils/productGrouping'
import { storeApi } from '../utils/storeApi'
import showroomInterior from '../assets/products/model-2.JPG'
import showroomShelves from '../assets/products/model-1.JPG'
import showroomShoes from '../assets/products/model-3.JPG'

function HomeSectionHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div className="max-w-2xl">
        <h2 className="text-[1.72rem] font-extrabold leading-[1.05] text-black sm:text-4xl lg:text-[2.65rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-zinc-600 sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

const showroomItems = [
  { id: 'interior', image: showroomInterior, labelKey: 'showroomGalleryInterior' },
  { id: 'shelves', image: showroomShelves, labelKey: 'showroomGalleryShelves' },
  { id: 'shoes', image: showroomShoes, labelKey: 'showroomGalleryShoes' },
  { id: 'detail', image: showroomShelves, labelKey: 'showroomGalleryLogo' },
]

function ShowroomSection({ t }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-black/6 bg-[#f4f1ea] px-4 py-5 text-black shadow-[0_24px_70px_rgba(15,15,16,0.08)] sm:rounded-[30px] sm:px-7 sm:py-8 lg:px-9 lg:py-10">
      <div className="mb-5 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">{t.showroomEyebrow}</p>
          <h2 className="mt-2 text-[1.72rem] font-extrabold leading-[1.05] sm:text-4xl lg:text-[2.65rem]">
            {t.showroomTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-black/60 sm:text-[15px]">
            {t.showroomSubtitle}
          </p>
        </div>
        <Link
          to="/contact"
          className="hidden rounded-full bg-black px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#ff3b30] sm:inline-flex"
        >
          {t.showroomCta}
        </Link>
      </div>

      <div className="grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {showroomItems.map((item, index) => (
          <article
            key={item.id}
            className={`group relative overflow-hidden rounded-[18px] bg-white shadow-[0_18px_44px_rgba(15,15,16,0.07)] ${index === 0 ? 'lg:col-span-2' : ''}`}
          >
            <div className="aspect-[4/5] lg:aspect-[3/4]">
              <img
                src={item.image}
                alt={t[item.labelKey]}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/56 via-black/4 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="text-sm font-extrabold drop-shadow">{t[item.labelKey]}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function OrderBanner({ t }) {
  return (
    <section className="grid gap-4 rounded-[24px] border border-black/6 bg-white p-5 shadow-[0_20px_54px_rgba(15,15,16,0.055)] sm:rounded-[30px] sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-9">
      <div className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff3b30]">{t.orderBannerEyebrow}</p>
        <h2 className="mt-2 text-[1.65rem] font-extrabold leading-[1.08] text-black sm:text-4xl">
          {t.orderBannerTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-[15px]">
          {t.orderBannerSubtitle}
        </p>
      </div>
      <div className="grid gap-2 sm:flex sm:items-center">
        <Link
          to="/catalog"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#ff3b30] sm:rounded-full"
        >
          {t.orderBannerCatalog}
        </Link>
        <Link
          to="/contact"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-extrabold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:rounded-full"
        >
          {t.orderBannerContact}
        </Link>
      </div>
    </section>
  )
}

export function HomePage() {
  const language = useShopStore((state) => state.language)
  const t = translations[language]
  const [backendProducts, setBackendProducts] = useState([])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      try {
        const response = await storeApi.get('/store/products', {
          signal: controller.signal,
          params: { page: 1, page_size: 40, sort: 'newest' },
        })
        setBackendProducts(groupProductsByBaseName(response.data.items || []))
      } catch {
        setBackendProducts([])
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [])

  const newProducts = useMemo(() => {
    const items = backendProducts.filter((product) => product.is_new || product.isNew)
    return (items.length ? items : backendProducts).slice(0, 6)
  }, [backendProducts])

  const shoeProducts = useMemo(
    () => backendProducts.filter((product) => product.type === 'shoe').slice(0, 6),
    [backendProducts],
  )

  const clothingProducts = useMemo(
    () => backendProducts.filter((product) => product.type === 'clothing').slice(0, 8),
    [backendProducts],
  )
  const featuredProducts = useMemo(
    () => {
      const items = backendProducts.filter((product) => product.featured)
      return (items.length ? items : backendProducts).slice(0, 6)
    },
    [backendProducts],
  )

  return (
    <div>
      <HeroSection />

      <div className="mx-auto space-y-11 px-3 py-8 sm:space-y-14 sm:px-6 sm:py-12 lg:max-w-[1560px] lg:space-y-16 lg:px-10 xl:px-14">
        <section>
          <CategoryList />
        </section>

        <section>
          <HomeSectionHeader
            title={t.homeNewTitle}
            description={t.homeNewSubtitle}
            action={
              <Link
                to="/new"
                className="hidden rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:inline-flex"
              >
                {t.editorialCta}
              </Link>
            }
          />
          {newProducts.length ? <ProductRail products={newProducts} /> : null}
        </section>

        {featuredProducts.length ? (
          <section className="rounded-[24px] border border-black/6 bg-white px-4 py-5 shadow-[0_20px_54px_rgba(15,15,16,0.055)] sm:rounded-[30px] sm:px-7 sm:py-8 lg:px-9 lg:py-10">
            <HomeSectionHeader
              title={t.featuredProductsTitle}
              description={t.featuredProductsSubtitle}
              action={
                <Link
                  to="/catalog"
                  className="hidden rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:inline-flex"
                >
                  {t.editorialCta}
                </Link>
              }
            />
            <ProductRail products={featuredProducts} />
          </section>
        ) : null}

        {shoeProducts.length ? (
          <section>
            <HomeSectionHeader
              title={t.sneakersCollectionTitle}
              description={t.sneakersCollectionSubtitle}
              action={
                <Link
                  to="/catalog?type=shoe"
                  className="hidden rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:inline-flex"
                >
                  {t.editorialCta}
                </Link>
              }
            />
            <ProductRail products={shoeProducts} />
          </section>
        ) : null}

        {clothingProducts.length ? (
          <section className="rounded-[28px] border border-black/6 bg-[#efeee9] px-4 py-6 shadow-[0_20px_55px_rgba(15,15,16,0.045)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <HomeSectionHeader
              title={t.clothingCollectionTitle}
              description={t.clothingCollectionSubtitle}
              action={
                <Link
                  to="/catalog?type=clothing"
                  className="hidden rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:inline-flex"
                >
                  {t.editorialCta}
                </Link>
              }
            />
            <ProductRail products={clothingProducts} />
          </section>
        ) : null}

        <ShowroomSection t={t} />
        <OrderBanner t={t} />
      </div>
    </div>
  )
}
