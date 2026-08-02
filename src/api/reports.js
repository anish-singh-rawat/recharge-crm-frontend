import api from '@/lib/axios'

export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMyRechargeReport: (params) =>
    api.get('/reports/recharge/my', { params }),
  getMyWalletReport: (params) =>
    api.get('/reports/wallet/my', { params }),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getSalesByDay: (params) => api.get('/reports/sales/by-day', { params }),
  getSalesByOperator: (params) =>
    api.get('/reports/sales/by-operator', { params }),
  getRechargeReport: (params) => api.get('/reports/recharge', { params }),
  getWalletReport: (params) => api.get('/reports/wallet', { params }),
  getCommissionReport: (params) =>
    api.get('/reports/commission', { params }),
}
