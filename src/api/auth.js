import api from '@/lib/axios'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh-token', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) =>
    api.patch('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data) => api.post('/auth/change-password', data),
  getSessions: () => api.get('/auth/sessions'),
  getLoginHistory: () => api.get('/auth/login-history'),
}
