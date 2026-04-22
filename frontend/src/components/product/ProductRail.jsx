import { ProductCard } from './ProductCard'

export function ProductRail({ products, className = '' }) {
  return (
    <div
      className={`overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="grid grid-flow-col auto-cols-[72%] gap-3 sm:auto-cols-[43%] sm:gap-5 lg:auto-cols-[30%] xl:auto-cols-[23%]">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
