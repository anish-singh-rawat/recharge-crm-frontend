import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { operatorsApi } from '@/api/operators'
import { extractError } from '@/utils/format'

const POPULAR_TOP_N = 5
const MOBILE_TYPES = ['MOBILE_PREPAID', 'MOBILE_POSTPAID']

export function useOperatorPlans({ operatorId, circleId, rechargeType, typedAmount }) {
  const enabled = !!operatorId && MOBILE_TYPES.includes(rechargeType)

  const query = useQuery({
    queryKey: ['plans', 'by-operator', operatorId, circleId ?? 'all'],
    queryFn: () =>
      operatorsApi.getPlans({
        operator: operatorId,
        ...(circleId ? { circle: circleId } : {}),
        limit: 1000,
      }),
    select: (res) => {
      const d = res.data?.data
      const items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []

      if (!circleId) {
        const seen = new Set()
        return items.filter((p) => {
          if (seen.has(p.amount)) return false
          seen.add(p.amount)
          return true
        })
      }

      return items
    },
    enabled,
    staleTime: 4 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })

  const rawPlans = query.data ?? []

  const { allPlans, popularPlans, regularPlans } = useMemo(() => {
    const sorted = [...rawPlans].sort((a, b) => {
      if (a.isPopular === b.isPopular) return a.amount - b.amount
      return a.isPopular ? -1 : 1
    })

    const explicitPopular = sorted.filter((p) => p.isPopular)

    if (explicitPopular.length === 0) {
      const popular = sorted.slice(0, POPULAR_TOP_N).map((p) => ({ ...p, isPopular: true }))
      const popularAmounts = new Set(popular.map((p) => p.amount))
      const all = sorted.map((p) =>
        popularAmounts.has(p.amount) ? { ...p, isPopular: true } : p,
      )
      return { allPlans: all, popularPlans: popular, regularPlans: all.slice(POPULAR_TOP_N) }
    }

    return {
      allPlans: sorted,
      popularPlans: explicitPopular,
      regularPlans: sorted.filter((p) => !p.isPopular),
    }
  }, [rawPlans])

  const { matchedPlan, validationState } = useMemo(() => {
    const amount = parseFloat(typedAmount)

    if (!enabled || query.isLoading) return { matchedPlan: null, validationState: 'idle' }
    if (!allPlans.length) return { matchedPlan: null, validationState: 'no_plans' }
    if (!typedAmount || isNaN(amount) || amount <= 0) return { matchedPlan: null, validationState: 'idle' }

    const plan = allPlans.find((p) => Number(p.amount) === amount) ?? null
    return { matchedPlan: plan, validationState: plan ? 'found' : 'not_found' }
  }, [typedAmount, allPlans, enabled, query.isLoading])

  return {
    allPlans,
    popularPlans,
    regularPlans,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? extractError(query.error) : null,
    matchedPlan,
    validationState,
    refetch: query.refetch,
  }
}
