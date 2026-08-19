import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, Gift, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { walletApi } from '@/api/wallet'
import Card, { CardHeader } from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime, extractError } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'

export default function Wallet() {
  const [page, setPage] = useState(1)
  const ready = useIsReady()
  const queryClient = useQueryClient()

  const { data: wallet } = useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: () => walletApi.getMyWallet(),
    select: (r) => r.data.data?.wallet || r.data.data,
    enabled: ready,
  })

  const { data: commission } = useQuery({
    queryKey: ['wallet', 'commission'],
    queryFn: () => walletApi.getMyCommission(),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['wallet', 'statement', { page }],
    queryFn: () => walletApi.getMyStatement({ page, limit: 15 }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const withdrawMutation = useMutation({
    mutationFn: () => walletApi.withdrawCommission(),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Commission added to wallet')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">My Wallet</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Balance and transaction history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0">
              <WalletIcon size={22} className="text-[#2563EB]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Available Balance</p>
              <p className="text-2xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(wallet?.balance)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#94A3B8]">Status</span>
              <StatusBadge status={wallet?.status || 'ACTIVE'} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
              <ArrowUpCircle size={20} className="text-[#16A34A]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Total Credit</p>
              <p className="text-xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(wallet?.totalCredited || wallet?.totalCredit || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center shrink-0">
              <ArrowDownCircle size={20} className="text-[#DC2626]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Total Debit</p>
              <p className="text-xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(wallet?.totalDebited || wallet?.totalDebit || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Gift size={20} className="text-[#7C3AED]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#94A3B8]">Total Commission</p>
              <p className="text-xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(commission?.totalCommission || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs mb-3">
            <div className="flex justify-between text-[#94A3B8]">
              <span>Withdrawn</span>
              <span className="font-mono text-[#475569]">{formatCurrency(commission?.withdrawn || 0)}</span>
            </div>
            <div className="flex justify-between text-[#94A3B8]">
              <span>Available</span>
              <span className={`font-mono font-semibold ${(commission?.available || 0) > 0 ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`}>
                {formatCurrency(commission?.available || 0)}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full"
            variant={commission?.available > 0 ? 'primary' : 'secondary'}
            leftIcon={<Download size={13} />}
            loading={withdrawMutation.isPending}
            disabled={!commission?.available || commission.available <= 0}
            onClick={() => withdrawMutation.mutate()}
          >
            Withdraw to Wallet
          </Button>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0]">
          <CardHeader title="Transaction Statement" />
        </div>
        {stmtLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : !statement?.items?.length ? (
          <EmptyState title="No transactions yet" icon={WalletIcon} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['Type', 'Amount', 'Balance After', 'Description', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statement.items.map((txn) => (
                    <tr key={txn._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          txn.type === 'CREDIT' || txn.type === 'COMMISSION' || txn.type === 'REFUND'
                            ? 'text-[#16A34A]'
                            : txn.type === 'COMMISSION'
                            ? 'text-[#7C3AED]'
                            : 'text-[#DC2626]'
                        }`}>
                          {txn.type === 'CREDIT' || txn.type === 'COMMISSION' || txn.type === 'REFUND'
                            ? <ArrowUpCircle size={13} />
                            : <ArrowDownCircle size={13} />}
                          {txn.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono font-semibold ${
                        txn.type === 'CREDIT' || txn.type === 'COMMISSION' || txn.type === 'REFUND'
                          ? 'text-[#16A34A]'
                          : 'text-[#DC2626]'
                      }`}>
                        {txn.type === 'CREDIT' || txn.type === 'COMMISSION' || txn.type === 'REFUND' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#0F172A]">{formatCurrency(txn.balanceAfter)}</td>
                      <td className="px-4 py-3 text-[#475569]">{txn.description || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(txn.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={statement.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
