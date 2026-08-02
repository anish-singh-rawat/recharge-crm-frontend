import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { walletApi } from '@/api/wallet'
import Card, { CardHeader } from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import { PageLoader, TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime } from '@/utils/format'

export default function Wallet() {
  const [page, setPage] = useState(1)

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: () => walletApi.getMyWallet(),
    select: (r) => r.data.data,
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['wallet', 'statement', { page }],
    queryFn: () => walletApi.getMyStatement({ page, limit: 15 }),
    select: (r) => r.data.data,
  })

  if (walletLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">My Wallet</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Balance and transaction history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
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
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
              <ArrowUpCircle size={20} className="text-[#16A34A]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Total Credit</p>
              <p className="text-xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(wallet?.totalCredit || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
              <ArrowDownCircle size={20} className="text-[#DC2626]" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8]">Total Debit</p>
              <p className="text-xl font-bold font-mono text-[#0F172A]">
                {formatCurrency(wallet?.totalDebit || 0)}
              </p>
            </div>
          </div>
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
                  {statement.items.map((txn) => (
                    <tr
                      key={txn._id}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            txn.type === 'CREDIT'
                              ? 'text-[#16A34A]'
                              : 'text-[#DC2626]'
                          }`}
                        >
                          {txn.type === 'CREDIT' ? (
                            <ArrowUpCircle size={13} />
                          ) : (
                            <ArrowDownCircle size={13} />
                          )}
                          {txn.type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-semibold ${
                          txn.type === 'CREDIT'
                            ? 'text-[#16A34A]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {txn.type === 'CREDIT' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#0F172A]">
                        {formatCurrency(txn.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {txn.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                        {formatDateTime(txn.createdAt)}
                      </td>
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
