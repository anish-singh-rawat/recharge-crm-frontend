import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Building2, MapPin, List } from 'lucide-react'
import { providerApi } from '@/api/provider'
import Card, { CardHeader } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'

export default function Provider() {
  const [planParams, setPlanParams] = useState({ operatorCode: '', circleCode: '' })
  const [fetchPlans, setFetchPlans] = useState(false)
  const ready = useIsReady()

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['provider', 'balance'],
    queryFn: () => providerApi.getProviderBalance(),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const { data: operators, isLoading: opsLoading } = useQuery({
    queryKey: ['provider', 'operators'],
    queryFn: () => providerApi.getProviderOperators(),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.operators)) return d.operators
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready,
  })

  const { data: circles, isLoading: circlesLoading } = useQuery({
    queryKey: ['provider', 'circles'],
    queryFn: () => providerApi.getProviderCircles(),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.circles)) return d.circles
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready,
  })

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['provider', 'plans', planParams],
    queryFn: () => providerApi.getProviderPlans(planParams.operatorCode, planParams.circleCode),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.plans)) return d.plans
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready && fetchPlans && !!planParams.operatorCode && !!planParams.circleCode,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Provider (MRobotics)</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Live provider balance, operators, circles and plans from MRobotics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#94A3B8]">Provider Balance</span>
            <button
              onClick={() => refetchBalance()}
              className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          {balanceLoading ? (
            <div className="h-8 bg-[#F1F5F9] rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold font-mono text-[#0F172A]">
              {balance?.balance !== undefined ? formatCurrency(balance.balance) : '—'}
            </p>
          )}
          {balance?.currency && (
            <p className="text-xs mt-1 text-[#94A3B8]">{balance.currency}</p>
          )}
        </Card>

        <StatCard
          title="Provider Operators"
          value={opsLoading ? '...' : operators?.length ?? 0}
          icon={<Building2 size={18} />}
          iconBg="bg-[#DBEAFE]"
          iconColor="text-[#2563EB]"
        />

        <StatCard
          title="Provider Circles"
          value={circlesLoading ? '...' : circles?.length ?? 0}
          icon={<MapPin size={18} />}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-[#16A34A]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padding={false}>
          <div className="p-4 border-b border-[#E2E8F0]">
            <CardHeader title="Operators" subtitle="From MRobotics" />
          </div>
          {opsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : !operators?.length ? (
            <EmptyState title="No operators from provider" icon={Building2} />
          ) : (
            <div className="overflow-y-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['Name', 'Code', 'Type'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op, i) => (
                    <tr key={op.code || i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-2.5 font-medium text-[#0F172A]">{op.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#475569]">{op.code}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="primary">{op.type || '—'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-4 border-b border-[#E2E8F0]">
            <CardHeader title="Circles" subtitle="From MRobotics" />
          </div>
          {circlesLoading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : !circles?.length ? (
            <EmptyState title="No circles from provider" icon={MapPin} />
          ) : (
            <div className="overflow-y-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['Name', 'Code'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {circles.map((c, i) => (
                    <tr key={c.code || i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-2.5 font-medium text-[#0F172A]">{c.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#475569]">{c.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Fetch Plans" subtitle="Query live plans from MRobotics" />
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Operator Code
            </label>
            <input
              placeholder="e.g. AIRTEL"
              value={planParams.operatorCode}
              onChange={(e) =>
                setPlanParams((p) => ({ ...p, operatorCode: e.target.value.toUpperCase() }))
              }
              className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Circle Code
            </label>
            <input
              placeholder="e.g. MH"
              value={planParams.circleCode}
              onChange={(e) =>
                setPlanParams((p) => ({ ...p, circleCode: e.target.value.toUpperCase() }))
              }
              className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <button
            onClick={() => setFetchPlans(true)}
            disabled={!planParams.operatorCode || !planParams.circleCode}
            className="px-4 py-2 bg-[#2563EB] text-white text-sm rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Fetch Plans
          </button>
        </div>

        {fetchPlans && planParams.operatorCode && planParams.circleCode && (
          <div className="mt-4">
            {plansLoading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : !plans?.length ? (
              <EmptyState title="No plans found" icon={List} />
            ) : (
              <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['Amount', 'Validity', 'Description'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan, i) => (
                      <tr key={i} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]">
                        <td className="px-4 py-2.5 font-mono font-bold text-[#0F172A]">
                          ₹{plan.amount || plan.rs}
                        </td>
                        <td className="px-4 py-2.5 text-[#475569]">
                          {plan.validity ? `${plan.validity}d` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[#475569]">
                          {plan.description || plan.desc || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
