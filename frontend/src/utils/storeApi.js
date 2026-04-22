import axios from 'axios'

const viteEnv = import.meta.env || {}

export const API_BASE_URL = viteEnv.VITE_API_URL || 'http://127.0.0.1:8000'

export const storeApi = axios.create({
  baseURL: API_BASE_URL,
})
