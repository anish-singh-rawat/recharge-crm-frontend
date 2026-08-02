import api from '@/lib/axios'

export const apiKeysApi = {
  getApiKeys: () => api.get('/api-keys'),
  createApiKey: (data) => api.post('/api-keys', data),
  getApiKeyById: (id) => api.get(`/api-keys/${id}`),
  revokeApiKey: (id) => api.patch(`/api-keys/${id}/revoke`),
}
