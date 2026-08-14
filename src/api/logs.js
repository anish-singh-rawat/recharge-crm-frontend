import api from '@/lib/axios'

export const logsApi = {
  getActivityLogs: (params) => api.get('/logs/activity', { params }),
  getAuditLogs: (params) => api.get('/logs/audit', { params }),
  getWebhookLogs: (params) => api.get('/logs/webhooks', { params }),

  deleteActivityLogs: () => api.delete('/logs/activity'),
  deleteAuditLogs: () => api.delete('/logs/audit'),
  deleteWebhookLogs: () => api.delete('/logs/webhooks'),
  deleteAllLogs: () => api.delete('/logs/all'),
}
