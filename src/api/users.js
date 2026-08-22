import api from '@/lib/axios'

export const usersApi = {
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  blockUser: (id, reason) => api.patch(`/users/${id}/block`, { reason }),
  unblockUser: (id) => api.patch(`/users/${id}/unblock`),
  toggleApiAccess: (id) => api.patch(`/users/${id}/api-access`),
  updateCommission: (id, commissionRate) => api.patch(`/users/${id}/commission`, { commissionRate }),
  updateContact: (id, data) => api.patch(`/auth/users/${id}/contact`, data),
}
