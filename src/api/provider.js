import api from '@/lib/axios'

export const providerApi = {
  getProviders: () => api.get('/provider'),
  getProviderBalance: () => api.get('/provider/balance'),
  getProviderOperators: () => api.get('/provider/operators'),
  getProviderCircles: () => api.get('/provider/circles'),
  getProviderPlans: (operatorCode, circleCode) =>
    api.get('/provider/plans', { params: { operatorCode, circleCode } }),
  detectOperator: (mobile) =>
    api.get('/provider/detect-operator', { params: { mobile } }),
}
