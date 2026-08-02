import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

const plainAxios = axios.create({ baseURL: BASE_URL })

export const healthApi = {
  ping: () => plainAxios.get('/ping'),
  health: () => plainAxios.get('/health'),
  version: () => plainAxios.get('/version'),
}
