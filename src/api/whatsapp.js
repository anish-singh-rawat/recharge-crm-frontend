import api from '@/lib/axios'

export const whatsappApi = {
  getStatus: () => api.get('/whatsapp/status'),
  connect: () => api.post('/whatsapp/connect'),
  regenerateQR: () => api.post('/whatsapp/regenerate-qr'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  sendMessage: (data) => api.post('/whatsapp/send-message', data),
}
