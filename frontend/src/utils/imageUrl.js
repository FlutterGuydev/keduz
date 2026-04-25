import { API_BASE_URL } from './storeApi.js'

export const PLACEHOLDER_IMAGE = '/placeholder.svg'

function getRawImageValue(image) {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.image_url || image.url || image.src || ''
}

export function getImageUrl(image) {
  const rawValue = getRawImageValue(image)
  if (!rawValue) return PLACEHOLDER_IMAGE

  const path = rawValue.trim().replace(/\\/g, '/')
  if (!path) return PLACEHOLDER_IMAGE

  if (/^(https?:|data:|blob:)/i.test(path)) {
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
