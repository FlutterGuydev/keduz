export function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} UZS`
}
