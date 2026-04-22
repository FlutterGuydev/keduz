import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi'
import { OrderForm } from '../components/form/OrderForm'
import { translations } from '../i18n/translations'
import { useShopStore } from '../store/useShopStore'
import { formatPrice } from '../utils/formatters'

export function CartPage() {
  const language = useShopStore((state) => state.language)
  const cartItems = useShopStore((state) => state.cartItems)
  const removeFromCart = useShopStore((state) => state.removeFromCart)
  const updateCartQuantity = useShopStore((state) => state.updateCartQuantity)
  const clearCart = useShopStore((state) => state.clearCart)
  const t = translations[language]

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-12 sm:px-6 lg:px-10 xl:px-14">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-black sm:text-5xl">
          {t.cartTitle}
        </h1>
      </div>

      {cartItems.length ? (
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.key} className="flex flex-col gap-4 rounded-[24px] border border-black/6 bg-white p-4 shadow-[0_16px_36px_rgba(15,15,16,0.045)] sm:flex-row sm:p-5">
                <img src={item.product.image} alt={item.product[`name_${language}`]} className="h-52 w-full rounded-[20px] object-cover sm:h-28 sm:w-28" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-black">{item.product[`name_${language}`]}</h3>
                  <div className="mt-2 space-y-1 text-sm text-zinc-500">
                    <p>{t.sizeLabel}: {item.size ?? '-'}</p>
                    <p className="flex items-center gap-2">
                      {t.selectedColorLabel}
                      <span className="inline-flex h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-white px-3 py-2">
                      <button type="button" onClick={() => updateCartQuantity(item.key, item.quantity - 1)}>
                        <FiMinus size={14} />
                      </button>
                      <span className="text-sm font-semibold text-black">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.key, item.quantity + 1)}>
                        <FiPlus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-black">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      <button type="button" onClick={() => removeFromCart(item.key)} className="text-zinc-500 hover:text-[#ff3b30]">
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-[24px] border border-black/6 bg-white p-6 shadow-[0_16px_36px_rgba(15,15,16,0.045)]">
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>{t.subtotal}</span>
                <span className="font-semibold text-black">{formatPrice(total)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xl font-extrabold text-black">
                <span>{t.total}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <OrderForm items={cartItems} onSuccess={clearCart} />
        </div>
      ) : (
        <div className="rounded-[28px] border border-black/6 bg-white p-12 text-center text-zinc-500">
          {t.cartEmpty}
        </div>
      )}
    </div>
  )
}
