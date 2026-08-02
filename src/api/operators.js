import api from '@/lib/axios'

export const operatorsApi = {
  getActiveOperators: (type) =>
    api.get('/operators/active', { params: { type } }),
  getOperators: (params) => api.get('/operators', { params }),
  createOperator: (data) => api.post('/operators', data),
  getOperatorById: (id) => api.get(`/operators/${id}`),
  updateOperator: (id, data) => api.put(`/operators/${id}`, data),
  deleteOperator: (id) => api.delete(`/operators/${id}`),

  getCircles: () => api.get('/operators/circles/all'),
  createCircle: (data) => api.post('/operators/circles', data),
  getCircleById: (id) => api.get(`/operators/circles/${id}`),
  updateCircle: (id, data) => api.put(`/operators/circles/${id}`, data),

  getPlans: (params) => api.get('/operators/plans', { params }),
  getPlansByOperator: (operatorId, circleId) =>
    api.get('/operators/plans/by-operator', {
      params: { operatorId, circleId },
    }),
  createPlan: (data) => api.post('/operators/plans', data),
  getPlanById: (id) => api.get(`/operators/plans/${id}`),
  updatePlan: (id, data) => api.put(`/operators/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/operators/plans/${id}`),
}
