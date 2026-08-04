import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Loader, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { rechargeApi } from '@/api/recharge'
import { operatorsApi } from '@/api/operators'
import { walletApi } from '@/api/wallet'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card, { CardHeader } from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import PlanRecommendations from '@/components/recharge/PlanRecommendations'
import { formatCurrency, formatDateTime, extractError } from '@/utils/format'
import { RECHARGE_TYPES } from '@/utils/constants'
import { useSocket } from '@/hooks/useSocket'
import { useIsReady } from '@/hooks/useIsReady'
import { useDetectOperator } from '@/hooks/useDetectOperator'

const schema = z.object({
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  amount: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  type: z.string().min(1, 'Select recharge type'),
  operatorId: z.string().min(1, 'Select an operator'),
  circleId: z.string().min(1, 'Select a circle'),
})

export default function Recharge() {
  const queryClient = useQueryClient()
  const ready = useIsReady()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [mobileFilter, setMobileFilter] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [lastTxn, setLastTxn] = useState(null)
  const [autoDetectedId, setAutoDetectedId] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'MOBILE_PREPAID' },
  })

  const rechargeType = watch('type')
  const operatorId = watch('operatorId')
  const circleId = watch('circleId')
  const mobileNumber = watch('mobileNumber')
  const typedAmount = watch('amount')


  const { data: wallet } = useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: () => walletApi.getMyWallet(),
    select: (r) => r.data.data?.wallet || r.data.data,
    enabled: ready,
  })

  const { data: operators = [] } = useQuery({
    queryKey: ['operators', 'active', rechargeType],
    queryFn: () => operatorsApi.getActiveOperators(rechargeType),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.operators)) return d.operators
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready && !!rechargeType,
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

  const { data: txnsData, isLoading: txnsLoading } = useQuery({
    queryKey: ['recharge', 'my', { page, status: statusFilter, mobileNumber: mobileFilter }],
    queryFn: () =>
      rechargeApi.getMyTransactions({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
        ...(mobileFilter.length === 10 && { mobileNumber: mobileFilter }),
      }),
    select: (r) => r.data.data,
    enabled: ready,
  })


  useSocket({
    'recharge:update': () => {
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
    },
    'recharge:success': (payload) => {
      setLastTxn((prev) =>
        prev?.txnId === payload.transaction?.txnId
          ? { ...prev, status: 'SUCCESS' }
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'me'] })
    },
    'recharge:failed': (payload) => {
      setLastTxn((prev) =>
        prev?.txnId === payload.transaction?.txnId
          ? { ...prev, status: 'FAILED' }
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
    },
  })


  const rechargeMutation = useMutation({
    mutationFn: (data) => rechargeApi.initiateRecharge(data),
    onSuccess: (res) => {
      setLastTxn(res.data.data)
      toast.success('Recharge initiated!')
      reset({ type: 'MOBILE_PREPAID' })
      setSelectedPlan(null)
      setAutoDetectedId(null)
      resetDetect()
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'me'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const onSubmit = (values) => {
    rechargeMutation.mutate({ ...values, amount: Number(values.amount) })
  }


  const applyPlan = (plan) => {
    setSelectedPlan(plan)
    setValue('amount', String(plan.amount), { shouldValidate: true })
  }


  const { detecting, detectedOperator, reset: resetDetect } = useDetectOperator(
    mobileNumber,
    rechargeType,
  )

  useEffect(() => {
    if (!detectedOperator) return

    if (detectedOperator.operatorCode) {
      const matched = operators.find(
        (o) => o.code?.toUpperCase() === detectedOperator.operatorCode?.toUpperCase(),
      )
      if (matched) {
        setValue('operatorId', matched._id)
        setAutoDetectedId(matched._id)
      }
    }

    if (detectedOperator.circleCode) {
      const matchedCircle = circles.find(
        (c) => c.code?.toUpperCase() === detectedOperator.circleCode?.toUpperCase(),
      )
      if (matchedCircle) {
        setValue('circleId', matchedCircle._id)
      }
    }
  }, [detectedOperator, operators, circles, setValue])

  useEffect(() => {
    setSelectedPlan(null)
  }, [operatorId, circleId])

  const operatorOptions = operators.map((o) => ({ value: o._id, label: o.name }))
  const circleOptions = circles.map((c) => ({ value: c._id, label: c.name }))


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Recharge</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Initiate mobile & utility recharges</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#94A3B8]">Wallet Balance</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#0F172A]">
              {formatCurrency(wallet?.balance)}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: wallet?.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}
            >
              {wallet?.status || 'ACTIVE'}
            </p>
          </Card>

          <Card>
            <CardHeader title="New Recharge" />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Select
                label="Recharge Type"
                options={RECHARGE_TYPES}
                error={errors.type?.message}
                required
                {...register('type')}
                onChange={(e) => {
                  setValue('type', e.target.value)
                  setValue('operatorId', '')
                  setValue('circleId', '')
                  setSelectedPlan(null)
                  setAutoDetectedId(null)
                  resetDetect()
                }}
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Mobile / Account Number"
                  placeholder="9876543210"
                  error={errors.mobileNumber?.message}
                  required
                  rightElement={
                    detecting ? (
                      <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                        <Loader size={13} className="animate-spin" />
                        <span className="hidden sm:inline">Detecting…</span>
                      </span>
                    ) : null
                  }
                  {...register('mobileNumber')}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Select
                  label="Operator"
                  options={operatorOptions}
                  placeholder="Select operator"
                  error={errors.operatorId?.message}
                  required
                  {...register('operatorId')}
                  onChange={(e) => {
                    setValue('operatorId', e.target.value)
                    if (autoDetectedId && e.target.value !== autoDetectedId) {
                      setAutoDetectedId(null)
                    }
                  }}
                />
                {autoDetectedId && operatorId === autoDetectedId && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#16A34A]">
                    <CheckCircle size={11} />
                    Auto-detected
                  </span>
                )}
              </div>

              <Select
                label="Circle / State"
                options={circleOptions}
                placeholder="Select circle"
                error={errors.circleId?.message}
                required
                {...register('circleId')}
              />

              <Input
                label="Amount (₹)"
                type="number"
                placeholder="199"
                error={errors.amount?.message}
                required
                {...register('amount')}
            
                onChange={(e) => {
                  register('amount').onChange(e)
                  if (
                    selectedPlan &&
                    String(selectedPlan.amount) !== e.target.value
                  ) {
                    setSelectedPlan(null)
                  }
                }}
              />

              {selectedPlan && (
                <div className="p-2.5 bg-[#DBEAFE] rounded-md text-xs text-[#2563EB] flex items-center gap-1.5">
                  <CheckCircle size={12} />
                  <span>
                    {selectedPlan.description
                      ? `${selectedPlan.description} — `
                      : ''}
                    Valid {selectedPlan.validity}
                    {selectedPlan.dataAmount ? ` · ${selectedPlan.dataAmount}` : ''}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={rechargeMutation.isPending}
                leftIcon={<Zap size={15} />}
              >
                Initiate Recharge
              </Button>
            </form>
          </Card>

          {/* Last transaction summary */}
          {lastTxn && (
            <Card>
              <CardHeader title="Last Transaction" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Txn ID</span>
                  <span className="font-mono text-xs">{lastTxn.txnId?.slice(-12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Status</span>
                  <StatusBadge status={lastTxn.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Amount</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(lastTxn.amount)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right column: plan recommendations + transaction history ──── */}
        <div className="lg:col-span-2 space-y-4">
          {/*
            PlanRecommendations handles its own visibility guard:
            only renders when operatorId + circleId are set and type is mobile.
            Passes typedAmount so validation banner updates as the retailer types.
          */}
          <PlanRecommendations
            operatorId={operatorId}
            circleId={circleId}
            rechargeType={rechargeType}
            typedAmount={typedAmount}
            selectedPlan={selectedPlan}
            onSelectPlan={applyPlan}
          />

          {/* Transaction history table */}
          <Card padding={false}>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-[#0F172A]">My Transactions</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  placeholder="Filter by mobile..."
                  value={mobileFilter}
                  onChange={(e) => {
                    setMobileFilter(e.target.value.replace(/\D/g, '').slice(0, 10))
                    setPage(1)
                  }}
                  className="w-32 px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                  className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">All Status</option>
                  {['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING', 'INITIATED', 'REFUNDED', 'TIMEOUT'].map(
                    (s) => <option key={s} value={s}>{s}</option>,
                  )}
                </select>
              </div>
            </div>

            {txnsLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : !txnsData?.items?.length ? (
              <EmptyState title="No transactions found" icon={Zap} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        {['Txn ID', 'Mobile', 'Operator', 'Amount', 'Status', 'Date'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txnsData.items.map((txn) => (
                        <tr
                          key={txn._id}
                          className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-[#475569]">
                            {txn.txnId?.slice(-10)}
                          </td>
                          <td className="px-4 py-3">{txn.mobileNumber}</td>
                          <td className="px-4 py-3 text-[#475569]">
                            {txn.operator?.name || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={txn.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                            {formatDateTime(txn.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pagination={txnsData.pagination} onPageChange={setPage} />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
