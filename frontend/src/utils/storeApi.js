import axios from 'axios'
import { API_BASE_URL } from './apiConfig.js'

export { API_BASE_URL }

export const storeApi = axios.create({
  baseURL: API_BASE_URL,
})
