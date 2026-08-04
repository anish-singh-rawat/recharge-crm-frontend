import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { operatorsApi } from '@/api/operators'
import { extractError } from '@/utils/format'

const MOBILE_TYPES = ['MOBILE_PREPAID', 'MOBILE_POSTPAID']

export function usePlanRecommendations({
  operatorId,
  circleId,
  rechargeType,
  typedAmount,
}) {
  const enabled =
    !!operatorId &&
    !!circleId &&
    MOBILE_TYPES.includes(rechargeType)

  const query = useQuery({
    queryKey: ['plans', 'recommendations', operatorId, circleId],
    queryFn: () => operatorsApi.getPlanRecommendations(operatorId, circleId),
    select: (res) => {
      const d = res.data?.data ?? {}
      return {
        popularPlans: Array.isArray(d.popularPlans) ? d.popularPlans : [],
        regularPlans: Array.isArray(d.regularPlans) ? d.regularPlans : [],
        allPlans: Array.isArray(d.allPlans) ? d.allPlans : [],
        source: d.source ?? 'unknown',
        cachedAt: d.cachedAt ?? null,
        operator: d.operator ?? null,
        circle: d.circle ?? null,
      }
    },
    enabled,
    staleTime: 14 * 60 * 1000,   
    gcTime: 20 * 60 * 1000,      
    retry: 1,
  })

  const { popularPlans, regularPlans, allPlans } = query.data ?? {
    popularPlans: [],
    regularPlans: [],
    allPlans: [],
  }

  const { matchedPlan, validationState } = useMemo(() => {
    const amount = parseFloat(typedAmount)

    if (!enabled || query.isLoading) {
      return { matchedPlan: null, validationState: 'idle' }
    }

    if (!allPlans.length) {
      return { matchedPlan: null, validationState: 'no_plans' }
    }

    if (!typedAmount || isNaN(amount) || amount <= 0) {
      return { matchedPlan: null, validationState: 'idle' }
    }

    const plan = allPlans.find((p) => Number(p.amount) === amount) ?? null
    return {
      matchedPlan: plan,
      validationState: plan ? 'found' : 'not_found',
    }
  }, [typedAmount, allPlans, enabled, query.isLoading])

  return {
    popularPlans,
    regularPlans,
    allPlans,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? extractError(query.error) : null,
    source: query.data?.source ?? null,
    matchedPlan,
    validationState,
    refetch: query.refetch,
  }
}
