const DEFAULT_API_URL = 'https://api.keduz.uz'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
