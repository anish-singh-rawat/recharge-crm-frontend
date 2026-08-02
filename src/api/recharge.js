import api from '@/lib/axios'

export const rechargeApi = {
  initiateRecharge: (data) => api.post('/recharge', data),
  getMyTransactions: (params) => api.get('/recharge/my', { params }),
  getMyTransactionStatus: (txnId) => api.get(`/recharge/status/${txnId}`),
  getAllTransactions: (params) => api.get('/recharge/all', { params }),
  getAdminTransactionStatus: (txnId) =>
    api.get(`/recharge/admin/status/${txnId}`),
  retryRecharge: (txnId) => api.post(`/recharge/${txnId}/retry`),
  refundRecharge: (txnId, reason) =>
    api.post(`/recharge/${txnId}/refund`, { reason }),
}
