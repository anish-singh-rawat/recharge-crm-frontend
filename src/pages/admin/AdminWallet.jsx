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
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Filter,
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

  // Ledger Filter states
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerType, setLedgerType] = useState('ALL')
  const [selectedLedgerUser, setSelectedLedgerUser] = useState(null)
  const ready = useIsReady()

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['wallet', 'ledger', { page, search: ledgerSearch, type: ledgerType, userId: selectedLedgerUser?._id }],
    queryFn: () =>
      walletApi.getLedger({
        page,
        limit: 20,
        ...(selectedLedgerUser?._id
          ? { userId: selectedLedgerUser._id }
          : ledgerSearch.trim()
          ? { search: ledgerSearch.trim() }
          : {}),
        ...(ledgerType !== 'ALL' ? { type: ledgerType } : {}),
      }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  // User suggestions for ledger search
  const { data: ledgerSearchedUsers } = useQuery({
    queryKey: ['users', 'ledger-user-search', ledgerSearch],
    queryFn: () => usersApi.getUsers({ search: ledgerSearch, limit: 5 }),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready && ledgerSearch.trim().length >= 2 && !selectedLedgerUser,
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
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setSelectedLedgerUser(u)
                      setLedgerSearch(u.name)
                      setPage(1)
                      document.getElementById('wallet-ledger-card')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    title="Filter Wallet Ledger for this user"
                  >
                    Ledger
                  </Button>
                  <Button size="xs" variant="success" onClick={() => openModal(u, 'credit')}>Credit</Button>
                  <Button size="xs" variant="danger" onClick={() => openModal(u, 'debit')}>Debit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card id="wallet-ledger-card" padding={false}>
        <div className="p-4 border-b border-[#E2E8F0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Wallet Ledger</h2>
              <p className="text-xs text-[#94A3B8]">View, search and filter all wallet credit & debit transactions</p>
            </div>

            {/* Reset Filters button */}
            {(ledgerSearch || selectedLedgerUser || ledgerType !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setLedgerSearch('')
                  setSelectedLedgerUser(null)
                  setLedgerType('ALL')
                  setPage(1)
                }}
                className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-md transition-colors"
              >
                <X size={13} />
                Reset Filters
              </button>
            )}
          </div>

          {/* Filters Bar: User Name/Phone Search & Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* User Search Input */}
            <div className="sm:col-span-8 relative">
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                Filter by User / Retailer Name
              </label>
              {selectedLedgerUser ? (
                <div className="flex items-center justify-between px-3 py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold">
                      {getInitials(selectedLedgerUser.name)}
                    </span>
                    <span className="font-semibold text-[#1E40AF] truncate">{selectedLedgerUser.name}</span>
                    <span className="text-xs text-[#3B82F6] font-mono">({selectedLedgerUser.phone || selectedLedgerUser.email})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLedgerUser(null)
                      setLedgerSearch('')
                      setPage(1)
                    }}
                    className="text-[#3B82F6] hover:text-[#1D4ED8] p-1 rounded-md"
                    title="Remove user filter"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    placeholder="Enter user name or phone to filter all related transactions..."
                    value={ledgerSearch}
                    onChange={(e) => {
                      setLedgerSearch(e.target.value)
                      setPage(1)
                    }}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  {ledgerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerSearch('')
                        setPage(1)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  {ledgerSearchedUsers?.length > 0 && !selectedLedgerUser && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#CBD5E1] rounded-lg shadow-lg overflow-hidden divide-y divide-[#F1F5F9] max-h-48 overflow-y-auto">
                      {ledgerSearchedUsers.map((u) => (
                        <div
                          key={u._id}
                          onClick={() => {
                            setSelectedLedgerUser(u)
                            setLedgerSearch(u.name)
                            setPage(1)
                          }}
                          className="px-3 py-2 hover:bg-[#EFF6FF] cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0F172A]">{u.name}</span>
                            <span className="text-[#64748B] font-mono">{u.phone}</span>
                          </div>
                          <span className="text-[10px] text-[#2563EB] font-medium bg-[#DBEAFE] px-1.5 py-0.5 rounded">
                            Select User
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Type Dropdown (CREDIT / DEBIT / ALL) */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                Transaction Type Filter
              </label>
              <select
                value={ledgerType}
                onChange={(e) => {
                  setLedgerType(e.target.value)
                  setPage(1)
                }}
                className="w-full py-2 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="ALL">All Types (Credit & Debit)</option>
                <option value="CREDIT">🟢 Credit Only (+)</option>
                <option value="DEBIT">🔴 Debit Only (-)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Summary Cards: "kitne bar credit kiya hai eska" */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Credit Card */}
            <div
              onClick={() => { setLedgerType('CREDIT'); setPage(1); }}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                ledgerType === 'CREDIT'
                  ? 'bg-[#DCFCE7] border-[#86EFAC] ring-2 ring-[#16A34A]'
                  : 'bg-[#F0FDF4] border-[#BBF7D0] hover:bg-[#DCFCE7]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#15803D] tracking-wide">Total Credited</p>
                  <p className="text-xs font-mono font-bold text-[#16A34A]">
                    {formatCurrency(ledger?.summary?.creditAmount || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#15803D]">
                  {ledger?.summary?.creditCount || 0}
                </span>
                <span className="text-[10px] text-[#166534] block font-medium">times credited</span>
              </div>
            </div>

            {/* Debit Card */}
            <div
              onClick={() => { setLedgerType('DEBIT'); setPage(1); }}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                ledgerType === 'DEBIT'
                  ? 'bg-[#FEE2E2] border-[#FCA5A5] ring-2 ring-[#DC2626]'
                  : 'bg-[#FEF2F2] border-[#FECACA] hover:bg-[#FEE2E2]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#B91C1C] tracking-wide">Total Debited</p>
                  <p className="text-xs font-mono font-bold text-[#DC2626]">
                    {formatCurrency(ledger?.summary?.debitAmount || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#B91C1C]">
                  {ledger?.summary?.debitCount || 0}
                </span>
                <span className="text-[10px] text-[#991B1B] block font-medium">times debited</span>
              </div>
            </div>

            {/* Total Records Card */}
            <div
              onClick={() => { setLedgerType('ALL'); setPage(1); }}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                ledgerType === 'ALL'
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] ring-2 ring-[#2563EB]'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <PlusCircle size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#1E40AF] tracking-wide">All Transactions</p>
                  <p className="text-xs font-medium text-[#64748B]">
                    {ledgerType === 'ALL' ? 'Showing All' : `Filtered by ${ledgerType}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#1E40AF]">
                  {ledger?.summary?.totalCount || ledger?.pagination?.total || 0}
                </span>
                <span className="text-[10px] text-[#64748B] block font-medium">total entries</span>
              </div>
            </div>
          </div>

          {/* Active Filter Banner */}
          {(selectedLedgerUser || ledgerSearch || ledgerType !== 'ALL') && (
            <div className="p-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs flex items-center justify-between text-[#334155]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-[#0F172A]">Filter Status:</span>
                {selectedLedgerUser && (
                  <span className="bg-white border border-[#CBD5E1] px-2 py-0.5 rounded text-[#1E40AF] font-medium">
                    User: {selectedLedgerUser.name}
                  </span>
                )}
                {!selectedLedgerUser && ledgerSearch && (
                  <span className="bg-white border border-[#CBD5E1] px-2 py-0.5 rounded text-[#1E40AF] font-medium">
                    Search: &ldquo;{ledgerSearch}&rdquo;
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded font-semibold ${
                  ledgerType === 'CREDIT' ? 'bg-[#DCFCE7] text-[#15803D]' : ledgerType === 'DEBIT' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-white text-[#475569] border border-[#CBD5E1]'
                }`}>
                  Type: {ledgerType === 'ALL' ? 'All Types' : ledgerType}
                </span>
                {(selectedLedgerUser || ledgerSearch) && (
                  <span className="text-[#64748B]">
                    • Credited <b className="text-[#16A34A]">{ledger?.summary?.creditCount || 0} times</b>, Debited <b className="text-[#DC2626]">{ledger?.summary?.debitCount || 0} times</b>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !ledger?.items?.length ? (
          <div className="p-8 text-center">
            <EmptyState
              title={selectedLedgerUser || ledgerSearch || ledgerType !== 'ALL' ? "No matching transactions found" : "No wallet records"}
              subtitle={selectedLedgerUser || ledgerSearch || ledgerType !== 'ALL' ? "Try changing your search term or transaction type filter." : undefined}
            />
            {(selectedLedgerUser || ledgerSearch || ledgerType !== 'ALL') && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setLedgerSearch('')
                  setSelectedLedgerUser(null)
                  setLedgerType('ALL')
                  setPage(1)
                }}
                className="mt-3"
              >
                Reset All Filters
              </Button>
            )}
          </div>
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
