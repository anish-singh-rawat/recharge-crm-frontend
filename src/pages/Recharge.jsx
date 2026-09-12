import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Loader, CheckCircle, CheckCircle2, XCircle, Clock, AlertTriangle, Smartphone, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { rechargeApi } from '@/api/recharge'
import { operatorsApi } from '@/api/operators'
import { walletApi } from '@/api/wallet'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
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
import { useOperatorPlans } from '@/hooks/useOperatorPlans'

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

  const [rechargeModal, setRechargeModal] = useState({
    isOpen: false,
    step: 'CONFIRM', // 'CONFIRM' | 'PROCESSING' | 'RESULT'
    data: null,
    result: null,
  })

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

  const plansData = useOperatorPlans({
    operatorId: ready ? operatorId : null,
    circleId,
    rechargeType,
    typedAmount,
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
      if (matchedCircle) setValue('circleId', matchedCircle._id)
    }
  }, [detectedOperator, operators, circles, setValue])

  useEffect(() => {
    setSelectedPlan(null)
  }, [operatorId])

  const resetRechargeForm = () => {
    reset({
      type: rechargeType || 'MOBILE_PREPAID',
      mobileNumber: '',
      operatorId: '',
      circleId: '',
      amount: '',
    })
    setValue('mobileNumber', '')
    setValue('operatorId', '')
    setValue('circleId', '')
    setValue('amount', '')
    setSelectedPlan(null)
    setAutoDetectedId(null)
    resetDetect()
  }

  useSocket({
    'recharge:update': () => {
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
    },
    'recharge:success': (payload) => {
      const txn = payload?.transaction
      setLastTxn((prev) =>
        prev?.txnId === txn?.txnId ? { ...prev, status: 'SUCCESS' } : prev,
      )
      setRechargeModal((prev) => {
        if (
          prev.isOpen &&
          (prev.result?.txn?.txnId === txn?.txnId ||
            prev.data?.mobileNumber === txn?.mobileNumber)
        ) {
          return {
            ...prev,
            step: 'RESULT',
            result: {
              isSuccess: true,
              isFailed: false,
              isPending: false,
              status: 'SUCCESS',
              txn,
              message: 'Recharge completed successfully!',
            },
          }
        }
        return prev
      })
      toast.success('Recharge successful!')
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'me'] })
    },
    'recharge:failed': (payload) => {
      const txn = payload?.transaction
      setLastTxn((prev) =>
        prev?.txnId === txn?.txnId ? { ...prev, status: 'FAILED' } : prev,
      )
      setRechargeModal((prev) => {
        if (
          prev.isOpen &&
          (prev.result?.txn?.txnId === txn?.txnId ||
            prev.data?.mobileNumber === txn?.mobileNumber)
        ) {
          return {
            ...prev,
            step: 'RESULT',
            result: {
              isSuccess: false,
              isFailed: true,
              isPending: false,
              status: 'FAILED',
              txn,
              message: txn?.providerMessage || 'Recharge failed',
            },
          }
        }
        return prev
      })
      toast.error(txn?.providerMessage || 'Recharge failed', { duration: 6000 })
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
    },
  })

  const rechargeMutation = useMutation({
    mutationFn: (data) => rechargeApi.initiateRecharge(data),
    onSuccess: (res) => {
      const txn = res.data.data?.transaction || res.data.data
      setLastTxn(txn)
      const status = txn?.status
      queryClient.invalidateQueries({ queryKey: ['recharge', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'me'] })

      setRechargeModal((prev) => ({
        ...prev,
        step: 'RESULT',
        result: {
          isSuccess: status === 'SUCCESS',
          isFailed: status === 'FAILED',
          isPending: ['PENDING', 'PROCESSING', 'INITIATED'].includes(status),
          status,
          txn,
          message:
            txn?.statusMessage ||
            txn?.providerMessage ||
            res.data?.message ||
            (status === 'SUCCESS' ? 'Recharge completed successfully!' : 'Recharge is being processed'),
        },
      }))

      if (status === 'SUCCESS') {
        toast.success('Recharge successful!')
      } else if (status === 'FAILED') {
        toast.error(txn?.providerMessage || res.data?.message || 'Recharge failed', { duration: 6000 })
      } else if (['PENDING', 'PROCESSING', 'INITIATED'].includes(status)) {
        toast('Recharge is being processed…', { icon: '⏳', duration: 5000 })
      } else {
        toast(res.data?.message || 'Recharge initiated', { icon: '📡' })
      }
    },
    onError: (err) => {
      const errMsg = extractError(err)
      toast.error(errMsg)
      setRechargeModal((prev) => ({
        ...prev,
        step: 'RESULT',
        result: {
          isSuccess: false,
          isFailed: true,
          isPending: false,
          status: 'FAILED',
          txn: null,
          message: errMsg,
        },
      }))
    },
  })

  const onSubmit = (values) => {
    const op = operators.find((o) => o._id === values.operatorId)
    const cir = circles.find((c) => c._id === values.circleId)
    setRechargeModal({
      isOpen: true,
      step: 'CONFIRM',
      data: {
        ...values,
        amount: Number(values.amount),
        operatorName: op?.name || 'Operator',
        operatorCode: op?.code || '',
        circleName: cir?.name || 'Circle',
        plan: selectedPlan,
      },
      result: null,
    })
  }

  const handleConfirmRecharge = () => {
    if (!rechargeModal.data) return
    setRechargeModal((prev) => ({ ...prev, step: 'PROCESSING' }))
    rechargeMutation.mutate({
      mobileNumber: rechargeModal.data.mobileNumber,
      amount: rechargeModal.data.amount,
      type: rechargeModal.data.type,
      operatorId: rechargeModal.data.operatorId,
      circleId: rechargeModal.data.circleId,
    })
  }

  const handleCloseModal = () => {
    if (rechargeMutation.isPending || rechargeModal.step === 'PROCESSING') return
    if (rechargeModal.result?.isSuccess) {
      resetRechargeForm()
    }
    setRechargeModal({ isOpen: false, step: 'CONFIRM', data: null, result: null })
  }

  const applyPlan = (plan) => {
    setSelectedPlan(plan)
    setValue('amount', String(plan.amount), { shouldValidate: true })
  }

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
            <div className="mb-1">
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
                    setValue('amount', '')
                    setSelectedPlan(null)
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
                  if (selectedPlan && String(selectedPlan.amount) !== e.target.value) {
                    setSelectedPlan(null)
                  }
                }}
              />

              {selectedPlan && (
                <div className="p-2.5 bg-[#DBEAFE] rounded-md text-xs text-[#2563EB] flex items-center gap-1.5">
                  <CheckCircle size={12} />
                  <span>
                    {selectedPlan.description ? `${selectedPlan.description} — ` : ''}
                    {selectedPlan.validity ? `Valid ${selectedPlan.validity}` : ''}
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
                  <span className="font-mono font-medium">{formatCurrency(lastTxn.amount)}</span>
                </div>
                {lastTxn.providerMessage && lastTxn.status === 'FAILED' && (
                  <p className="text-[10px] text-[#DC2626] pt-1 border-t border-[#E2E8F0]">
                    {lastTxn.providerMessage}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <PlanRecommendations
            operatorId={operatorId}
            circleId={circleId}
            rechargeType={rechargeType}
            typedAmount={typedAmount}
            selectedPlan={selectedPlan}
            onSelectPlan={applyPlan}
            externalData={plansData}
          />

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
                  {['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING', 'INITIATED', 'REFUNDED', 'TIMEOUT'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {txnsLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : !txnsData?.items?.length ? (
              <EmptyState title="No transactions found" icon={Zap} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        {['Txn ID', 'Provider Rc ID', 'Mobile', 'Operator', 'Circle', 'Amount', 'Status', 'Date'].map((h) => (
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
                          <td className="px-4 py-3 font-mono text-xs text-[#0891B2]">
                            {txn.providerTxnId || '—'}
                          </td>
                          <td className="px-4 py-3">{txn.mobileNumber}</td>
                          <td className="px-4 py-3 text-[#475569]">{txn.operator?.name || '—'}</td>
                          <td className="px-4 py-3 text-[#475569]">{txn.circle?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono font-medium">{formatCurrency(txn.amount)}</td>
                          <td className="px-4 py-3"><StatusBadge status={txn.status} /></td>
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

      {/* ── Recharge Confirmation & Result Modal ──────────────────── */}
      <Modal
        open={rechargeModal.isOpen}
        onClose={handleCloseModal}
        title={
          rechargeModal.step === 'CONFIRM'
            ? 'Confirm Recharge'
            : rechargeModal.step === 'PROCESSING'
            ? 'Processing Recharge'
            : rechargeModal.result?.isSuccess
            ? 'Recharge Successful'
            : rechargeModal.result?.isPending
            ? 'Recharge Processing'
            : 'Recharge Failed'
        }
        size="md"
      >
        {rechargeModal.isOpen && (
          <div className="space-y-5">
            {/* STEP 1: CONFIRM */}
            {rechargeModal.step === 'CONFIRM' && rechargeModal.data && (
              <div className="space-y-4">
                {/* Big Highlights Hero Card */}
                <div className="p-5 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-2xl text-center space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#2563EB]/10 text-[#1D4ED8] uppercase tracking-wide">
                    {rechargeModal.data.type?.replace('_', ' ')}
                  </span>

                  {/* Big Amount */}
                  <div className="font-mono font-extrabold text-4xl text-[#0F172A] tracking-tight">
                    ₹{rechargeModal.data.amount}
                  </div>

                  {/* Big Number */}
                  <div className="flex items-center justify-center gap-2 text-xl font-bold font-mono text-[#1E3A8A]">
                    <Smartphone size={22} className="text-[#2563EB]" />
                    <span>+91 {rechargeModal.data.mobileNumber}</span>
                  </div>

                  <p className="text-xs font-medium text-[#475569]">
                    {rechargeModal.data.operatorName} • {rechargeModal.data.circleName}
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="border border-[#E2E8F0] rounded-xl text-xs divide-y divide-[#E2E8F0] bg-white">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[#64748B]">Current Wallet Balance</span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      {formatCurrency(wallet?.balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[#64748B]">Deduction Amount</span>
                    <span className="font-mono font-bold text-[#DC2626]">
                      - {formatCurrency(rechargeModal.data.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC]">
                    <span className="font-medium text-[#334155]">Balance After Recharge</span>
                    <span className="font-mono font-bold text-[#16A34A]">
                      {formatCurrency(Math.max(0, (wallet?.balance || 0) - rechargeModal.data.amount))}
                    </span>
                  </div>
                  {rechargeModal.data.plan && (
                    <div className="px-4 py-2.5 bg-[#F0FDF4] text-[#166534] space-y-0.5">
                      <p className="font-semibold text-[11px]">Selected Plan Details:</p>
                      <p className="text-[11px]">
                        {rechargeModal.data.plan.description || ''}
                        {rechargeModal.data.plan.validity ? ` • Validity: ${rechargeModal.data.plan.validity}` : ''}
                        {rechargeModal.data.plan.dataAmount ? ` • Data: ${rechargeModal.data.plan.dataAmount}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-2.5"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 py-2.5 !bg-[#2563EB] hover:!bg-[#1D4ED8] text-white font-semibold text-sm shadow-md"
                    leftIcon={<Zap size={16} />}
                    onClick={handleConfirmRecharge}
                  >
                    Confirm & Pay ₹{rechargeModal.data.amount}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PROCESSING */}
            {rechargeModal.step === 'PROCESSING' && (
              <div className="py-8 text-center space-y-4">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#2563EB]/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center text-[#2563EB]">
                    <Loader size={32} className="animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#0F172A]">Processing Recharge…</h3>
                  <p className="text-sm font-mono text-[#2563EB] font-semibold">
                    +91 {rechargeModal.data?.mobileNumber} • ₹{rechargeModal.data?.amount}
                  </p>
                  <p className="text-xs text-[#94A3B8] pt-1">
                    Contacting operator servers. Please wait a moment...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: RESULT */}
            {rechargeModal.step === 'RESULT' && rechargeModal.result && (
              <div className="space-y-4">
                {/* SUCCESS */}
                {rechargeModal.result.isSuccess && (
                  <div className="p-5 bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#86EFAC] rounded-2xl text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-extrabold text-[#15803D]">Recharge Successful!</h3>
                    <div className="font-mono text-3xl font-black text-[#0F172A]">
                      ₹{rechargeModal.result.txn?.amount || rechargeModal.data?.amount}
                    </div>
                    <p className="text-sm font-mono font-bold text-[#166534]">
                      +91 {rechargeModal.result.txn?.mobileNumber || rechargeModal.data?.mobileNumber}
                    </p>
                    <p className="text-xs text-[#15803D]">
                      {rechargeModal.data?.operatorName}
                    </p>
                  </div>
                )}

                {/* FAILED */}
                {rechargeModal.result.isFailed && (
                  <div className="p-5 bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border border-[#FCA5A5] rounded-2xl text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-md">
                      <XCircle size={32} />
                    </div>
                    <h3 className="text-xl font-extrabold text-[#B91C1C]">Recharge Failed</h3>
                    <div className="font-mono text-2xl font-bold text-[#0F172A]">
                      ₹{rechargeModal.result.txn?.amount || rechargeModal.data?.amount}
                    </div>
                    <p className="text-sm font-mono font-bold text-[#991B1B]">
                      +91 {rechargeModal.result.txn?.mobileNumber || rechargeModal.data?.mobileNumber}
                    </p>
                    <div className="mt-2 p-2.5 bg-white/80 border border-[#FECACA] rounded-lg text-xs text-[#B91C1C] font-medium">
                      {rechargeModal.result.message || 'The operator rejected this recharge request.'}
                    </div>
                    <p className="text-[11px] text-[#7F1D1D] pt-1">
                      Wallet balance has been refunded / not deducted.
                    </p>
                  </div>
                )}

                {/* PENDING / PROCESSING */}
                {rechargeModal.result.isPending && (
                  <div className="p-5 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#D97706] text-white flex items-center justify-center shadow-md">
                      <Clock size={32} />
                    </div>
                    <h3 className="text-xl font-extrabold text-[#B45309]">Recharge Pending</h3>
                    <div className="font-mono text-2xl font-bold text-[#0F172A]">
                      ₹{rechargeModal.result.txn?.amount || rechargeModal.data?.amount}
                    </div>
                    <p className="text-sm font-mono font-bold text-[#92400E]">
                      +91 {rechargeModal.result.txn?.mobileNumber || rechargeModal.data?.mobileNumber}
                    </p>
                    <p className="text-xs text-[#92400E] pt-1">
                      The recharge is currently being processed by the operator. Your wallet is safe and will be updated automatically.
                    </p>
                  </div>
                )}

                {/* Breakdown Details Table */}
                {rechargeModal.result.txn && (
                  <div className="border border-[#E2E8F0] rounded-xl text-xs divide-y divide-[#E2E8F0] bg-white">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[#64748B]">Transaction ID</span>
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {rechargeModal.result.txn.txnId}
                      </span>
                    </div>
                    {(rechargeModal.result.txn.operatorRef || rechargeModal.result.txn.providerTxnId) && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[#64748B]">Operator Ref ID</span>
                        <span className="font-mono text-[#0F172A]">
                          {rechargeModal.result.txn.operatorRef || rechargeModal.result.txn.providerTxnId}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[#64748B]">Final Status</span>
                      <StatusBadge status={rechargeModal.result.status} />
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[#64748B]">Date & Time</span>
                      <span className="text-[#0F172A]">
                        {formatDateTime(rechargeModal.result.txn.createdAt || new Date())}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {rechargeModal.result.isFailed && (
                    <Button
                      variant="secondary"
                      className="flex-1 py-2.5"
                      leftIcon={<RefreshCw size={14} />}
                      onClick={() => setRechargeModal((prev) => ({ ...prev, step: 'CONFIRM' }))}
                    >
                      Try Again
                    </Button>
                  )}
                  <Button
                    className="flex-1 py-2.5 !bg-[#0F172A] hover:!bg-[#1E293B] text-white font-medium"
                    onClick={handleCloseModal}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
