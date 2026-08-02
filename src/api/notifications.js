import api from '@/lib/axios'

export const notificationsApi = {
  getMyNotifications: (params) =>
    api.get('/notifications/my', { params }),
  markAllRead: () => api.patch('/notifications/my/read-all'),
  markOneRead: (id) => api.patch(`/notifications/my/${id}/read`),
  getAllNotifications: (params) => api.get('/notifications', { params }),
  sendNotification: (data) => api.post('/notifications', data),
  broadcastNotification: (data) => api.post('/notifications/broadcast', data),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
}
