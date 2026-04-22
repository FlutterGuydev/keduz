import { create } from 'zustand'

const getCartKey = (productId, size, color) => `${productId}-${size ?? 'nosize'}-${color ?? 'nocolor'}`

export const useShopStore = create((set) => ({
  language: 'uz',
  searchQuery: '',
  favorites: [],
  cartItems: [],
  setLanguage: (language) => set({ language }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleFavorite: (productId) =>
    set((state) => ({
      favorites: state.favorites.includes(productId)
        ? state.favorites.filter((id) => id !== productId)
        : [...state.favorites, productId],
    })),
  addToCart: ({ product, size, color, quantity = 1 }) =>
    set((state) => {
      const key = getCartKey(product.id, size, color)
      const existing = state.cartItems.find((item) => item.key === key)

      if (existing) {
        return {
          cartItems: state.cartItems.map((item) =>
            item.key === key
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        }
      }

      return {
        cartItems: [
          ...state.cartItems,
          {
            key,
            product,
            size,
            color,
            quantity,
          },
        ],
      }
    }),
  removeFromCart: (key) =>
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.key !== key),
    })),
  updateCartQuantity: (key, quantity) =>
    set((state) => ({
      cartItems: state.cartItems
        .map((item) =>
          item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  clearCart: () => set({ cartItems: [] }),
}))
