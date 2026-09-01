import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CornerDownLeft, Search, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { rechargeApi } from '@/api/recharge'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime, extractError } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'
import { useSocket } from '@/hooks/useSocket'

export default function AdminRecharge() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [mobileFilter, setMobileFilter] = useState('')

  const [refundModal, setRefundModal] = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const [forceRefundConfirm, setForceRefundConfirm] = useState(false)

  const [retryModal, setRetryModal] = useState(null)

  const ready = useIsReady()

  const { data, isLoading } = useQuery({
    queryKey: ['recharge', 'all', { page, status: statusFilter, mobileNumber: mobileFilter }],
    queryFn: () =>
      rechargeApi.getAllTransactions({
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
        ...(mobileFilter.length === 10 && { mobileNumber: mobileFilter }),
      }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  useSocket({
    'recharge:update:all': () => {
      queryClient.invalidateQueries({ queryKey: ['recharge', 'all'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: (txnId) => rechargeApi.retryRecharge(txnId),
    onSuccess: () => {
      toast.success('Recharge retry initiated')
      queryClient.invalidateQueries({ queryKey: ['recharge', 'all'] })
      setRetryModal(null)
    },
    onError: (err) => {
      toast.error(extractError(err))
      setRetryModal(null)
    },
  })

  const refundMutation = useMutation({
    mutationFn: ({ txnId, reason, forceRefundSuccess }) =>
      rechargeApi.refundRecharge(txnId, reason, forceRefundSuccess),
    onSuccess: () => {
      toast.success('Refund processed successfully')
      queryClient.invalidateQueries({ queryKey: ['recharge', 'all'] })
      setRefundModal(null)
      setRefundReason('')
      setForceRefundConfirm(false)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">All Transactions</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Monitor and manage all recharge transactions</p>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
          <CardHeader title="Transactions" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                placeholder="Mobile number..."
                value={mobileFilter}
                onChange={(e) => { setMobileFilter(e.target.value.replace(/\D/g, '').slice(0, 10)); setPage(1) }}
                className="pl-8 pr-3 py-1.5 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-36"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Status</option>
              {['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING', 'INITIATED', 'REFUNDED', 'REVERSED', 'TIMEOUT'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : !data?.items?.length ? (
          <EmptyState title="No transactions found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['Txn ID', 'Provider Rc ID', 'Provider', 'Retailer', 'Mobile', 'Operator', 'Amount', 'Commission', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((txn) => (
                    <tr key={txn._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#475569]">{txn.txnId?.slice(-10)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0891B2]">{txn.providerTxnId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${txn.usedProvider === 'realrobo' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#DBEAFE] text-[#2563EB]'}`}>
                          {txn.usedProvider === 'realrobo' ? 'RealRobo' : 'MRobotics'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0F172A]">{txn.user?.name || '—'}</p>
                        <p className="text-xs text-[#94A3B8]">{txn.user?.phone}</p>
                      </td>
                      <td className="px-4 py-3">{txn.mobileNumber}</td>
                      <td className="px-4 py-3 text-[#475569]">{txn.operator?.name || '—'}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatCurrency(txn.amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#7C3AED]">{txn.commission ? formatCurrency(txn.commission) : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={txn.status} /></td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(txn.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(txn.status === 'FAILED' || txn.status === 'TIMEOUT') && (
                            <button
                              onClick={() => setRetryModal(txn)}
                              className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
                              title="Retry Recharge"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          {txn.status === 'SUCCESS' && (
                            <button
                              onClick={() => { setRefundModal(txn); setForceRefundConfirm(false) }}
                              className="p-1.5 rounded hover:bg-[#FEF3C7] text-[#D97706] transition-colors"
                              title="Force Refund"
                            >
                              <CornerDownLeft size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* ── Retry Confirm Modal ───────────────────────────────────── */}
      <Modal
        open={!!retryModal}
        onClose={() => setRetryModal(null)}
        title="Confirm Retry Recharge"
        size="sm"
      >
        {retryModal && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
              <AlertTriangle size={18} className="text-[#2563EB] shrink-0 mt-0.5" />
              <p className="text-sm text-[#1E40AF]">
                Are you sure you want to retry this recharge? The retailer's wallet will be debited again if the retry succeeds.
              </p>
            </div>

            <div className="space-y-2 text-sm border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
              {[
                ['Txn ID', <span className="font-mono text-xs">{retryModal.txnId}</span>],
                ['Mobile', retryModal.mobileNumber],
                ['Operator', retryModal.operator?.name || '—'],
                ['Amount', <span className="font-mono font-semibold">{formatCurrency(retryModal.amount)}</span>],
                ['Status', <StatusBadge status={retryModal.status} />],
                ['Provider', <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${retryModal.usedProvider === 'realrobo' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#DBEAFE] text-[#2563EB]'}`}>{retryModal.usedProvider === 'realrobo' ? 'RealRobo' : 'MRobotics'}</span>],
                ['Failed at', formatDateTime(retryModal.updatedAt)],
                ['Retry #', `${retryModal.retryCount || 0} / ${retryModal.maxRetries || 3}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[#94A3B8] text-xs">{label}</span>
                  <span className="text-[#0F172A]">{value}</span>
                </div>
              ))}
            </div>

            {retryModal.providerMessage && (
              <div className="p-3 bg-[#FFF5F5] border border-[#FCA5A5] rounded-lg text-xs text-[#DC2626]">
                <span className="font-semibold">Failure reason: </span>{retryModal.providerMessage}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setRetryModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                leftIcon={<RefreshCw size={14} />}
                loading={retryMutation.isPending}
                onClick={() => retryMutation.mutate(retryModal.txnId || retryModal._id)}
              >
                Yes, Retry
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Refund Modal ──────────────────────────────────────────── */}
      <Modal
        open={!!refundModal}
        onClose={() => { setRefundModal(null); setForceRefundConfirm(false) }}
        title={refundModal?.status === 'SUCCESS' ? 'Force Refund — Successful Recharge' : 'Process Refund'}
        size="sm"
      >
        {refundModal && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
              {[
                ['Txn ID', <span className="font-mono text-xs">{refundModal.txnId}</span>],
                ['Mobile', refundModal.mobileNumber],
                ['Operator', refundModal.operator?.name || '—'],
                ['Amount', <span className="font-mono font-semibold text-[#DC2626]">{formatCurrency(refundModal.amount)}</span>],
                ['Retailer', refundModal.user?.name || '—'],
                ['Status', <StatusBadge status={refundModal.status} />],
                ['Date', formatDateTime(refundModal.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[#94A3B8] text-xs">{label}</span>
                  <span className="text-[#0F172A]">{value}</span>
                </div>
              ))}
            </div>

            {refundModal.status === 'SUCCESS' && (
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#B45309] space-y-2">
                <p className="font-semibold">⚠️ This recharge was completed successfully.</p>
                <p>Refunding will return {formatCurrency(refundModal.amount)} to the retailer's wallet. The recharge itself will NOT be reversed with the operator.</p>
                <label className="flex items-center gap-2 cursor-pointer pt-1 font-medium text-[#92400E]">
                  <input
                    type="checkbox"
                    checked={forceRefundConfirm}
                    onChange={(e) => setForceRefundConfirm(e.target.checked)}
                    className="accent-[#D97706]"
                  />
                  I confirm this forced refund
                </label>
              </div>
            )}

            <Input
              label="Reason"
              placeholder="Reason for refund..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => { setRefundModal(null); setForceRefundConfirm(false) }}>
                Cancel
              </Button>
              <Button
                variant="warning"
                className="flex-1"
                leftIcon={<CornerDownLeft size={14} />}
                disabled={refundModal.status === 'SUCCESS' && !forceRefundConfirm}
                loading={refundMutation.isPending}
                onClick={() => refundMutation.mutate({
                  txnId: refundModal.txnId || refundModal._id,
                  reason: refundReason,
                  forceRefundSuccess: refundModal.status === 'SUCCESS' ? forceRefundConfirm : false,
                })}
              >
                {refundModal.status === 'SUCCESS' ? 'Force Refund' : 'Process Refund'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
