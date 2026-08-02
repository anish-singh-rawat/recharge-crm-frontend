import api from '@/lib/axios'

export const walletApi = {
  getMyWallet: () => api.get('/wallet/me'),
  getMyStatement: (params) => api.get('/wallet/me/statement', { params }),
  getLedger: (params) => api.get('/wallet/ledger', { params }),
  getUserWallet: (userId) => api.get(`/wallet/${userId}`),
  getUserStatement: (userId, params) =>
    api.get(`/wallet/${userId}/statement`, { params }),
  creditWallet: (userId, data) => api.post(`/wallet/${userId}/credit`, data),
  debitWallet: (userId, data) => api.post(`/wallet/${userId}/debit`, data),
  freezeWallet: (userId, reason) =>
    api.patch(`/wallet/${userId}/freeze`, { reason }),
  unfreezeWallet: (userId) => api.patch(`/wallet/${userId}/unfreeze`),
}
