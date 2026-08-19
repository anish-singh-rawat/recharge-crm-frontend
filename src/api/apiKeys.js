import api from '@/lib/axios'

export const apiKeysApi = {
  getApiKeys: () => api.get('/api-keys'),
  createApiKey: (data) => api.post('/api-keys', data),
  getApiKeyById: (id) => api.get(`/api-keys/${id}`),
  revokeApiKey: (id, reason = '') => api.patch(`/api-keys/${id}/revoke`, { reason }),
  updateAllowedIps: (id, allowedIps) => api.patch(`/api-keys/${id}/allowed-ips`, { allowedIps }),
}
