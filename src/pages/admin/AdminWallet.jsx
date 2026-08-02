import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search,
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { walletApi } from '@/api/wallet'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime, extractError } from '@/utils/format'

const creditSchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, 'Enter valid amount'),
  description: z.string().min(1, 'Description required'),
  remarks: z.string().optional(),
})

function CreditDebitModal({ open, onClose, userId, mode }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(creditSchema) })

  const mutation = useMutation({
    mutationFn: (data) =>
      mode === 'credit'
        ? walletApi.creditWallet(userId, { ...data, amount: Number(data.amount) })
        : walletApi.debitWallet(userId, { ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      toast.success(`Wallet ${mode}ed successfully`)
      queryClient.invalidateQueries({ queryKey: ['wallet', 'ledger'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', userId] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
      size="sm"
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          label="Amount (₹)"
          type="number"
          placeholder="1000"
          error={errors.amount?.message}
          required
          {...register('amount')}
        />
        <Input
          label="Description"
          placeholder="Manual top-up"
          error={errors.description?.message}
          required
          {...register('description')}
        />
        <Input
          label="Remarks"
          placeholder="Customer request"
          {...register('remarks')}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            className="flex-1"
            variant={mode === 'credit' ? 'success' : 'danger'}
            type="submit"
            loading={mutation.isPending}
          >
            {mode === 'credit' ? 'Credit' : 'Debit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminWallet() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalMode, setModalMode] = useState(null)
  const [freezeModal, setFreezeModal] = useState(null)
  const [freezeReason, setFreezeReason] = useState('')

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['wallet', 'ledger', { page }],
    queryFn: () => walletApi.getLedger({ page, limit: 20 }),
    select: (r) => r.data.data,
  })

  const freezeMutation = useMutation({
    mutationFn: ({ userId, frozen }) =>
      frozen
        ? walletApi.freezeWallet(userId, freezeReason)
        : walletApi.unfreezeWallet(userId),
    onSuccess: (_, vars) => {
      toast.success(`Wallet ${vars.frozen ? 'frozen' : 'unfrozen'}`)
      queryClient.invalidateQueries({ queryKey: ['wallet', 'ledger'] })
      setFreezeModal(null)
      setFreezeReason('')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const openModal = (user, mode) => {
    setSelectedUser(user)
    setModalMode(mode)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Wallet Management</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Manage retailer wallets</p>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0]">
          <CardHeader title="Wallet Ledger" />
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !ledger?.items?.length ? (
          <EmptyState title="No wallet records" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['User', 'Type', 'Amount', 'Balance After', 'Description', 'Date', 'Actions'].map((h) => (
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
                  {ledger.items.map((txn) => (
                    <tr
                      key={txn._id}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#0F172A]">
                            {txn.user?.name || '—'}
                          </p>
                          <p className="text-xs text-[#94A3B8]">{txn.user?.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            txn.type === 'CREDIT' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-semibold ${
                          txn.type === 'CREDIT' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {txn.type === 'CREDIT' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatCurrency(txn.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-[#475569] max-w-[150px] truncate">
                        {txn.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                        {formatDateTime(txn.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {txn.user && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModal(txn.user, 'credit')}
                              className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors"
                              title="Credit"
                            >
                              <PlusCircle size={15} />
                            </button>
                            <button
                              onClick={() => openModal(txn.user, 'debit')}
                              className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"
                              title="Debit"
                            >
                              <MinusCircle size={15} />
                            </button>
                            <button
                              onClick={() => setFreezeModal({ userId: txn.user._id, frozen: true })}
                              className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
                              title="Freeze"
                            >
                              <Lock size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={ledger.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CreditDebitModal
        open={!!modalMode}
        onClose={() => { setModalMode(null); setSelectedUser(null) }}
        userId={selectedUser?._id}
        mode={modalMode}
      />

      <Modal
        open={!!freezeModal}
        onClose={() => setFreezeModal(null)}
        title={freezeModal?.frozen ? 'Freeze Wallet' : 'Unfreeze Wallet'}
        size="sm"
      >
        <div className="space-y-3">
          {freezeModal?.frozen && (
            <Input
              label="Reason"
              placeholder="Suspected fraud"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setFreezeModal(null)}>
              Cancel
            </Button>
            <Button
              variant={freezeModal?.frozen ? 'danger' : 'success'}
              className="flex-1"
              onClick={() => freezeMutation.mutate(freezeModal)}
              loading={freezeMutation.isPending}
            >
              {freezeModal?.frozen ? 'Freeze' : 'Unfreeze'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
