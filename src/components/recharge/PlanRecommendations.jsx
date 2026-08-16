import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flame,
  LayoutGrid,
  Wifi,
  Clock,
  MessageSquare,
  Phone,
} from 'lucide-react'
import clsx from 'clsx'
import Card, { CardHeader } from '@/components/ui/Card'
import PlanCard from './PlanCard'
import { usePlanRecommendations } from '@/hooks/usePlanRecommendations'
import { formatCurrency } from '@/utils/format'

function PlanCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] p-3 bg-white animate-pulse">
      <div className="h-6 w-16 bg-[#F1F5F9] rounded mb-2" />
      <div className="flex gap-1 mb-2">
        <div className="h-4 w-14 bg-[#F1F5F9] rounded-full" />
        <div className="h-4 w-16 bg-[#F1F5F9] rounded-full" />
      </div>
      <div className="h-3 w-full bg-[#F1F5F9] rounded mb-1" />
      <div className="h-3 w-3/4 bg-[#F1F5F9] rounded mb-2" />
      <div className="h-6 w-full bg-[#F1F5F9] rounded-lg" />
    </div>
  )
}

function ValidationBanner({ validationState, matchedPlan, typedAmount }) {
  if (validationState === 'idle' || validationState === 'no_plans') return null

  if (validationState === 'found' && matchedPlan) {
    return (
      <div className="rounded-xl border border-[#16A34A] bg-[#F0FDF4] p-3 text-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 size={16} className="text-[#16A34A] shrink-0" />
          <span className="font-semibold text-[#16A34A]">Plan Found</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#15803D]">
          <span className="font-bold font-mono text-base text-[#0F172A]">
            {formatCurrency(matchedPlan.amount)}
          </span>
          {matchedPlan.dataAmount ? (
            <span className="inline-flex items-center gap-1"><Wifi size={11} />{matchedPlan.dataAmount}</span>
          ) : null}
          {matchedPlan.validity ? (
            <span className="inline-flex items-center gap-1"><Clock size={11} />Validity {matchedPlan.validity}</span>
          ) : null}
          {matchedPlan.smsCount > 0 ? (
            <span className="inline-flex items-center gap-1"><MessageSquare size={11} />{matchedPlan.smsCount} SMS/day</span>
          ) : null}
          {/unlimited/i.test(matchedPlan.description) ? (
            <span className="inline-flex items-center gap-1"><Phone size={11} />Unlimited Calling</span>
          ) : null}
        </div>
        {matchedPlan.description ? (
          <p className="mt-1.5 text-[11px] text-[#475569] line-clamp-2">{matchedPlan.description}</p>
        ) : null}
      </div>
    )
  }

  if (validationState === 'not_found') {
    return (
      <div className="rounded-xl border border-[#DC2626] bg-[#FFF5F5] p-3 text-sm flex items-start gap-2">
        <XCircle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
        <p className="text-[#DC2626] text-xs leading-snug">
          <span className="font-semibold">No plan exists for {formatCurrency(parseFloat(typedAmount))}.</span>
          {' '}Please choose another recharge amount from the plans below.
        </p>
      </div>
    )
  }

  return null
}

function PopularPill({ plan, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={clsx(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold font-mono border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1',
        isSelected
          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow'
          : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]',
      )}
    >
      <Flame size={11} className={isSelected ? 'text-white' : 'text-[#F59E0B]'} />
      ₹{plan.amount}
    </button>
  )
}

export default function PlanRecommendations({
  operatorId,
  circleId,
  rechargeType,
  typedAmount,
  selectedPlan,
  onSelectPlan,
  externalData,
}) {
  const [search, setSearch] = useState('')

  const hookData = usePlanRecommendations(
    externalData
      ? { operatorId: null, circleId: null, rechargeType: null, typedAmount: null }
      : { operatorId, circleId, rechargeType, typedAmount }
  )

  const {
    popularPlans,
    allPlans,
    isLoading,
    isFetching,
    isError,
    error,
    source,
    validationState,
    matchedPlan,
    refetch,
  } = externalData ?? hookData

  const shouldShow =
    !!operatorId &&
    ['MOBILE_PREPAID', 'MOBILE_POSTPAID'].includes(rechargeType)

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allPlans
    return allPlans.filter((p) =>
      [String(p.amount), p.validity, p.description, p.dataAmount]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [allPlans, search])

  const handleClearSearch = useCallback(() => setSearch(''), [])

  if (!shouldShow) return null

  if (isLoading) {
    return (
      <Card>
        <CardHeader
          title="Recharge Plans"
          icon={<LayoutGrid size={16} />}
          subtitle="Loading available plans…"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader title="Recharge Plans" icon={<LayoutGrid size={16} />} />
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <XCircle size={32} className="text-[#DC2626]" />
          <p className="text-sm text-[#475569]">
            {error || 'Unable to load recharge plans.'}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!isLoading && allPlans.length === 0) {
    return (
      <Card>
        <CardHeader title="Recharge Plans" icon={<LayoutGrid size={16} />} />
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <LayoutGrid size={32} className="text-[#CBD5E1]" />
          <p className="text-sm font-medium text-[#475569]">No recharge plans available</p>
          <p className="text-xs text-[#94A3B8]">No plans found for this operator.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Recharge Plans"
        icon={<LayoutGrid size={16} />}
        subtitle={`${allPlans.length} plans available`}
        action={
          <div className="flex items-center gap-2">
            {source && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                source === 'mrobotics'
                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : source === 'cache'
                  ? 'bg-[#DBEAFE] text-[#2563EB]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}>
                {source === 'mrobotics' ? '⚡ Live' : source === 'cache' ? '⚡ Cached' : '🗄 DB'}
              </span>
            )}
            {isFetching && (
              <span className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                <RefreshCw size={11} className="animate-spin" />
                Refreshing
              </span>
            )}
          </div>
        }
      />

      <div className="space-y-4">
        <ValidationBanner
          validationState={validationState}
          matchedPlan={matchedPlan}
          typedAmount={typedAmount}
        />

        {popularPlans.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Flame size={13} className="text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#0F172A]">Popular Plans</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularPlans.map((plan, idx) => (
                <PopularPill
                  key={plan._id ?? `pop-${idx}`}
                  plan={plan}
                  isSelected={selectedPlan && Number(selectedPlan.amount) === Number(plan.amount)}
                  onSelect={onSelectPlan}
                />
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by amount, validity, data…"
            className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-8 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>

        {filteredPlans.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#475569]">
              No plans match <span className="font-medium">"{search}"</span>
            </p>
            <button type="button" onClick={handleClearSearch} className="mt-1.5 text-xs text-[#2563EB] hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredPlans.map((plan, idx) => (
              <PlanCard
                key={plan._id ?? `plan-${idx}`}
                plan={plan}
                isSelected={selectedPlan && Number(selectedPlan.amount) === Number(plan.amount)}
                onSelect={onSelectPlan}
              />
            ))}
          </div>
        )}

        {search && filteredPlans.length > 0 && (
          <p className="text-center text-[10px] text-[#94A3B8]">
            Showing {filteredPlans.length} of {allPlans.length} plans
          </p>
        )}
      </div>
    </Card>
  )
}
