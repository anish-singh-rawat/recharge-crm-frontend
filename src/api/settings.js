import api from '@/lib/axios'

export const settingsApi = {
  getPublicSettings: () => api.get('/settings/public'),
  getAllSettings: (params) => api.get('/settings', { params }),
  getSettingByKey: (key) => api.get(`/settings/${key}`),
  updateSetting: (key, value) => api.put(`/settings/${key}`, { value }),
  bulkUpdateSettings: (settings) =>
    api.post('/settings/bulk', { settings }),
}
