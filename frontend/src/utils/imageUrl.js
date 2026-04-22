import { API_BASE_URL } from './storeApi.js'

export const PLACEHOLDER_IMAGE = '/placeholder.svg'

export function getImageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE
  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path
  }
  if (path.startsWith('/')) {
    if (path.startsWith('/uploads/')) {
      return `${API_BASE_URL.replace(/\/$/, '')}${path}`
    }
    return path
  }
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`
}

export function resolveImageUrl(value) {
  return getImageUrl(value)
}

export function handleImageError(event) {
  if (event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return
  event.currentTarget.src = PLACEHOLDER_IMAGE
}
