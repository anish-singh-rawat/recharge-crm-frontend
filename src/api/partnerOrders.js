import api from '@/lib/axios'

export const partnerOrdersApi = {
  importExcel: (formData) =>
    api.post('/partner-orders/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  listOrders: (params) => api.get('/partner-orders', { params }),

  getSummary: (params) => api.get('/partner-orders/summary', { params }),

  updatePartnerMobile: (prmId, mobileNumber) =>
    api.patch(`/partner-orders/partner/${encodeURIComponent(prmId)}/mobile`, {
      mobileNumber,
    }),

  updateOrderPayment: (id, paidAmount) =>
    api.patch(`/partner-orders/${id}/payment`, {
      paidAmount,
    }),

  bulkMarkAsPaid: (orderIds) =>
    api.patch('/partner-orders/bulk-mark-paid', { orderIds }),

  deleteOrder: (id) => api.delete(`/partner-orders/${id}`),

  bulkDelete: (orderIds) => api.post('/partner-orders/bulk-delete', { orderIds }),

  sendNotifications: (data) =>
    api.post('/partner-orders/send-notifications', data),
}
