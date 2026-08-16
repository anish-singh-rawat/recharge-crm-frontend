import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X, Flame, Wifi, Clock, MessageSquare, Building2 } from 'lucide-react'
import { operatorsApi } from '@/api/operators'
import Card, { CardHeader } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { useIsReady } from '@/hooks/useIsReady'

function PlanRow({ plan, onSelect }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
      onClick={() => onSelect && onSelect(plan)}
    >
      <div className="flex items-center gap-2 w-24 shrink-0">
        <span className="font-mono font-bold text-[#0F172A] text-sm">₹{plan.amount}</span>
        {plan.isPopular && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-semibold">
            <Flame size={9} />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 flex-1">
        {plan.validity ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#2563EB] bg-[#DBEAFE] px-1.5 py-0.5 rounded-full">
            <Clock size={9} />{plan.validity}
          </span>
        ) : null}
        {plan.dataAmount ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full">
            <Wifi size={9} />{plan.dataAmount}
          </span>
        ) : null}
        {plan.smsCount > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#0891B2] bg-[#CFFAFE] px-1.5 py-0.5 rounded-full">
            <MessageSquare size={9} />{plan.smsCount} SMS
          </span>
        ) : null}
      </div>
      <p className="text-xs text-[#94A3B8] flex-1 line-clamp-1 hidden sm:block">
        {plan.description || '—'}
      </p>
      <Badge variant="default">{plan.planType || 'TOPUP'}</Badge>
    </div>
  )
}

export default function OperatorsPlans() {
  const ready = useIsReady()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedOperator, setSelectedOperator] = useState(null)
  const [circleFilter, setCircleFilter] = useState('')

  const { data: operators = [], isLoading: opsLoading } = useQuery({
    queryKey: ['operators', 'active', 'MOBILE_PREPAID'],
    queryFn: () => operatorsApi.getActiveOperators('MOBILE_PREPAID'),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.operators)) return d.operators
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready,
  })

  const { data: circles = [] } = useQuery({
    queryKey: ['circles', 'all'],
    queryFn: () => operatorsApi.getCircles(),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.circles)) return d.circles
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready,
  })

  const { data: rawPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans', 'by-operator', selectedOperator?._id, circleFilter || 'all'],
    queryFn: () =>
      operatorsApi.getPlans({
        operator: selectedOperator._id,
        ...(circleFilter ? { circle: circleFilter } : {}),
        limit: 1000,
      }),
    select: (r) => {
      const d = r.data?.data
      if (Array.isArray(d?.items)) {
        if (!circleFilter) {
          const seen = new Set()
          return d.items.filter((p) => {
            if (seen.has(p.amount)) return false
            seen.add(p.amount)
            return true
          })
        }
        return d.items
      }
      return []
    },
    enabled: ready && !!selectedOperator,
  })

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rawPlans
    return rawPlans.filter((p) =>
      [String(p.amount), p.validity, p.description, p.dataAmount]
        .join(' ').toLowerCase().includes(q)
    )
  }, [rawPlans, search])

  const handleSelectPlan = (plan) => {
    navigate('/recharge', { state: { prefillAmount: plan.amount, prefillOperatorId: selectedOperator?._id } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Operators & Plans</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Browse available recharge plans by operator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1">
          <Card padding={false}>
            <div className="p-3 border-b border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#0F172A]">Operators</p>
            </div>
            {opsLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 bg-[#F1F5F9] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : operators.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#94A3B8]">No operators found</div>
            ) : (
              <div className="p-2 space-y-0.5">
                {operators.map((op) => (
                  <button
                    key={op._id}
                    type="button"
                    onClick={() => { setSelectedOperator(op); setSearch(''); setCircleFilter('') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      selectedOperator?._id === op._id
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    <Building2 size={15} />
                    {op.name}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedOperator ? (
            <Card>
              <EmptyState
                title="Select an operator"
                description="Choose an operator from the left to view available plans"
                icon={Building2}
              />
            </Card>
          ) : (
            <Card padding={false}>
              <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
                <CardHeader title={`${selectedOperator.name} Plans`} />
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <select
                    value={circleFilter}
                    onChange={(e) => setCircleFilter(e.target.value)}
                    className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#F8FAFC]"
                  >
                    <option value="">All Circles</option>
                    {circles.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="relative flex-1 min-w-[160px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search amount, data…"
                      className="w-full pl-8 pr-7 py-1.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#F8FAFC]"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {plansLoading ? (
                <TableSkeleton rows={8} cols={4} />
              ) : filteredPlans.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#475569]">
                    {search ? `No plans match "${search}"` : `No plans available for ${selectedOperator.name}`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                    <span className="w-24 shrink-0">Amount</span>
                    <span className="flex-1">Benefits</span>
                    <span className="flex-1 hidden sm:block">Description</span>
                    <span>Type</span>
                  </div>
                  <div className="max-h-[560px] overflow-y-auto">
                    {filteredPlans.map((plan, idx) => (
                      <PlanRow
                        key={plan._id ?? idx}
                        plan={plan}
                        onSelect={handleSelectPlan}
                      />
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[#E2E8F0] text-xs text-[#94A3B8]">
                    {search
                      ? `Showing ${filteredPlans.length} of ${rawPlans.length} plans`
                      : `${filteredPlans.length} plans available`}
                    {' · '}Click any plan to recharge
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
