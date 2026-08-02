import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { walletApi } from '@/api/wallet'
import { usersApi } from '@/api/users'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime, extractError, getInitials } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'

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
    formState: { errors },
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
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalMode, setModalMode] = useState(null)
  const [freezeModal, setFreezeModal] = useState(null)
  const [freezeReason, setFreezeReason] = useState('')
  const [userWalletModal, setUserWalletModal] = useState(null)
  const ready = useIsReady()

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['wallet', 'ledger', { page }],
    queryFn: () => walletApi.getLedger({ page, limit: 20 }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const { data: searchedUsers } = useQuery({
    queryKey: ['users', 'wallet-search', search],
    queryFn: () => usersApi.getUsers({ search, limit: 10, role: 'retailer' }),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready && search.length >= 2,
  })

  const { data: userWallet } = useQuery({
    queryKey: ['wallet', 'user', userWalletModal?._id],
    queryFn: () => walletApi.getUserWallet(userWalletModal._id),
    select: (r) => r.data.data?.wallet || r.data.data,
    enabled: !!userWalletModal,
  })

  const { data: userStatement } = useQuery({
    queryKey: ['wallet', 'user-statement', userWalletModal?._id],
    queryFn: () => walletApi.getUserStatement(userWalletModal._id, { page: 1, limit: 10 }),
    select: (r) => r.data.data,
    enabled: !!userWalletModal,
  })

  const freezeMutation = useMutation({
    mutationFn: ({ userId, frozen }) =>
      frozen
        ? walletApi.freezeWallet(userId, freezeReason)
        : walletApi.unfreezeWallet(userId),
    onSuccess: (_, vars) => {
      toast.success(`Wallet ${vars.frozen ? 'frozen' : 'unfrozen'}`)
      queryClient.invalidateQueries({ queryKey: ['wallet', 'ledger'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'user'] })
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
        <p className="text-sm text-[#94A3B8] mt-0.5">Credit, debit, freeze and view retailer wallets</p>
      </div>

      <Card>
        <CardHeader title="Find Retailer Wallet" />
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            placeholder="Search retailer by name or phone (min 2 chars)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
        {searchedUsers?.length > 0 && (
          <div className="mt-3 divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
            {searchedUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#2563EB] text-xs font-semibold">
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{u.name}</p>
                    <p className="text-xs text-[#94A3B8]">{u.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="xs" variant="ghost" onClick={() => setUserWalletModal(u)}>View</Button>
                  <Button size="xs" variant="success" onClick={() => openModal(u, 'credit')}>Credit</Button>
                  <Button size="xs" variant="danger" onClick={() => openModal(u, 'debit')}>Debit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0]">
          <CardHeader title="Wallet Ledger" subtitle="All wallet transactions" />
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
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((txn) => (
                    <tr key={txn._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#0F172A]">{txn.user?.name || '—'}</p>
                          <p className="text-xs text-[#94A3B8]">{txn.user?.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${txn.type === 'CREDIT' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono font-semibold ${txn.type === 'CREDIT' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(txn.balanceAfter)}</td>
                      <td className="px-4 py-3 text-[#475569] max-w-[150px] truncate">{txn.description || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(txn.createdAt)}</td>
                      <td className="px-4 py-3">
                        {txn.user && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openModal(txn.user, 'credit')} className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors" title="Credit"><PlusCircle size={15} /></button>
                            <button onClick={() => openModal(txn.user, 'debit')} className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors" title="Debit"><MinusCircle size={15} /></button>
                            <button onClick={() => setFreezeModal({ userId: txn.user._id, frozen: true })} className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors" title="Freeze"><Lock size={15} /></button>
                            <button onClick={() => setFreezeModal({ userId: txn.user._id, frozen: false })} className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors" title="Unfreeze"><Unlock size={15} /></button>
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
        onClose={() => { setFreezeModal(null); setFreezeReason('') }}
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
          {!freezeModal?.frozen && (
            <p className="text-sm text-[#475569]">Unfreeze this wallet and restore access?</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setFreezeModal(null); setFreezeReason('') }}>Cancel</Button>
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

      <Modal open={!!userWalletModal} onClose={() => setUserWalletModal(null)} title={`${userWalletModal?.name}'s Wallet`} size="md">
        {userWallet && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs text-[#94A3B8]">Balance</p>
                <p className="text-xl font-bold font-mono text-[#0F172A] mt-0.5">{formatCurrency(userWallet.balance)}</p>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs text-[#94A3B8]">Status</p>
                <div className="mt-1"><StatusBadge status={userWallet.status || 'ACTIVE'} /></div>
              </div>
            </div>
            {userStatement?.items?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#94A3B8] mb-2">Recent Transactions</p>
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                  {userStatement.items.map((t) => (
                    <div key={t._id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className={t.type === 'CREDIT' ? 'text-[#16A34A] font-medium' : 'text-[#DC2626] font-medium'}>
                        {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <span className="text-xs text-[#94A3B8]">{formatDateTime(t.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="success" className="flex-1" onClick={() => { setUserWalletModal(null); openModal(userWalletModal, 'credit') }}>Credit</Button>
              <Button size="sm" variant="danger" className="flex-1" onClick={() => { setUserWalletModal(null); openModal(userWalletModal, 'debit') }}>Debit</Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setUserWalletModal(null); setFreezeModal({ userId: userWalletModal._id, frozen: true }) }}>Freeze</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
