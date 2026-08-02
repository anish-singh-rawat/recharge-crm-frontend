import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts'
import { reportsApi } from '@/api/reports'
import Card, { CardHeader } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { PageLoader, TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/format'
import useAuthStore from '@/store/authStore'

const COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#7C3AED']

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'recharge', label: 'Recharge' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'commission', label: 'Commission' },
]

export default function Reports() {
  const { isAdmin } = useAuthStore()
  const admin = isAdmin()
  const [tab, setTab] = useState('overview')
  const [rechargePage, setRechargePage] = useState(1)
  const [walletPage, setWalletPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  })

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', dateRange],
    queryFn: () => reportsApi.getSalesReport(dateRange),
    select: (r) => r.data.data,
    enabled: admin,
  })

  const { data: salesByDay } = useQuery({
    queryKey: ['reports', 'sales-by-day', dateRange],
    queryFn: () => reportsApi.getSalesByDay(dateRange),
    select: (r) => r.data.data || [],
    enabled: admin && tab === 'overview',
  })

  const { data: salesByOperator } = useQuery({
    queryKey: ['reports', 'sales-by-operator', dateRange],
    queryFn: () => reportsApi.getSalesByOperator(dateRange),
    select: (r) => r.data.data || [],
    enabled: admin && tab === 'overview',
  })

  const { data: rechargeReport, isLoading: rechargeLoading } = useQuery({
    queryKey: ['reports', 'recharge-admin', { page: rechargePage, status: statusFilter, ...dateRange }],
    queryFn: () =>
      reportsApi.getRechargeReport({
        page: rechargePage,
        limit: 20,
        ...dateRange,
        ...(statusFilter && { status: statusFilter }),
      }),
    select: (r) => r.data.data,
    enabled: admin && tab === 'recharge',
  })

  const { data: walletReport, isLoading: walletLoading } = useQuery({
    queryKey: ['reports', 'wallet-admin', { page: walletPage, ...dateRange }],
    queryFn: () =>
      reportsApi.getWalletReport({ page: walletPage, limit: 20, ...dateRange }),
    select: (r) => r.data.data,
    enabled: admin && tab === 'wallet',
  })

  const { data: commissionReport, isLoading: commissionLoading } = useQuery({
    queryKey: ['reports', 'commission', dateRange],
    queryFn: () => reportsApi.getCommissionReport(dateRange),
    select: (r) => r.data.data || [],
    enabled: admin && tab === 'commission',
  })

  const { data: myRechargeReport } = useQuery({
    queryKey: ['reports', 'recharge-my', dateRange],
    queryFn: () => reportsApi.getMyRechargeReport(dateRange),
    select: (r) => r.data.data,
    enabled: !admin,
  })

  const { data: myWalletReport } = useQuery({
    queryKey: ['reports', 'wallet-my', dateRange],
    queryFn: () => reportsApi.getMyWalletReport(dateRange),
    select: (r) => r.data.data,
    enabled: !admin,
  })

  if (admin && salesLoading) return <PageLoader />

  const summary = salesReport?.summary || {}

  const DateRangePicker = (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={dateRange.startDate}
        onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
        className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
      />
      <span className="text-[#94A3B8] text-sm">to</span>
      <input
        type="date"
        value={dateRange.endDate}
        onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
        className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Reports</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Analytics and performance metrics</p>
        </div>
        {DateRangePicker}
      </div>

      {admin ? (
        <>
          <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-lg w-fit">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#475569]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sales"
                  value={formatCurrency(summary.totalAmount)}
                  icon={<span className="text-base font-bold">₹</span>}
                  iconBg="bg-[#DCFCE7]"
                  iconColor="text-[#16A34A]"
                />
                <StatCard
                  title="Total Transactions"
                  value={formatNumber(summary.totalTransactions)}
                  iconBg="bg-[#DBEAFE]"
                  iconColor="text-[#2563EB]"
                />
                <StatCard
                  title="Success Rate"
                  value={
                    summary.totalTransactions
                      ? `${((summary.successCount / summary.totalTransactions) * 100).toFixed(1)}%`
                      : '0%'
                  }
                  iconBg="bg-[#DCFCE7]"
                  iconColor="text-[#16A34A]"
                />
                <StatCard
                  title="Total Commission"
                  value={formatCurrency(summary.totalCommission)}
                  iconBg="bg-[#EDE9FE]"
                  iconColor="text-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {salesByDay?.length > 0 && (
                  <Card padding={false}>
                    <div className="p-5 border-b border-[#E2E8F0]">
                      <CardHeader title="Daily Sales" subtitle="Amount per day" />
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={salesByDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis
                            dataKey="_id"
                            tick={{ fontSize: 11, fill: '#94A3B8' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#94A3B8' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `₹${v / 1000}k`}
                          />
                          <Tooltip
                            formatter={(v) => [formatCurrency(v), 'Amount']}
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="totalAmount"
                            stroke="#2563EB"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {salesByOperator?.length > 0 && (
                  <Card>
                    <CardHeader title="Sales by Operator" />
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={salesByOperator} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E8F0"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `₹${v / 1000}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="_id"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip
                          formatter={(v) => [formatCurrency(v), 'Amount']}
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                          }}
                        />
                        <Bar dataKey="totalAmount" radius={[0, 3, 3, 0]}>
                          {salesByOperator.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </>
          )}

          {tab === 'recharge' && (
            <Card padding={false}>
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <CardHeader title="Recharge Report" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setRechargePage(1)
                  }}
                  className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">All Status</option>
                  {['SUCCESS', 'FAILED', 'PENDING', 'PROCESSING', 'REFUNDED', 'TIMEOUT'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>
              {rechargeLoading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : !rechargeReport?.items?.length ? (
                <EmptyState title="No recharge data for this period" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                          {['Txn ID', 'Retailer', 'Mobile', 'Operator', 'Amount', 'Status', 'Date'].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rechargeReport.items.map((txn) => (
                          <tr
                            key={txn._id}
                            className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-[#475569]">
                              {txn.txnId?.slice(-10)}
                            </td>
                            <td className="px-4 py-3 text-[#0F172A]">{txn.user?.name || '—'}</td>
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
                  <Pagination
                    pagination={rechargeReport.pagination}
                    onPageChange={setRechargePage}
                  />
                </>
              )}
            </Card>
          )}

          {tab === 'wallet' && (
            <Card padding={false}>
              <div className="p-4 border-b border-[#E2E8F0]">
                <CardHeader title="Wallet Report" />
              </div>
              {walletLoading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : !walletReport?.items?.length ? (
                <EmptyState title="No wallet data for this period" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                          {['User', 'Type', 'Amount', 'Balance After', 'Description', 'Date'].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {walletReport.items.map((txn) => (
                          <tr
                            key={txn._id}
                            className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#0F172A]">{txn.user?.name || '—'}</p>
                              <p className="text-xs text-[#94A3B8]">{txn.user?.phone}</p>
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
                            <td className="px-4 py-3 text-[#475569] max-w-[180px] truncate">
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
                  <Pagination
                    pagination={walletReport.pagination}
                    onPageChange={setWalletPage}
                  />
                </>
              )}
            </Card>
          )}

          {tab === 'commission' && (
            <Card padding={false}>
              <div className="p-4 border-b border-[#E2E8F0]">
                <CardHeader title="Commission Report" subtitle="Per retailer commission earned" />
              </div>
              {commissionLoading ? (
                <TableSkeleton rows={8} cols={4} />
              ) : !commissionReport?.length ? (
                <EmptyState title="No commission data for this period" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        {['Retailer', 'Transactions', 'Total Amount', 'Commission'].map((h) => (
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
                      {commissionReport.map((row, i) => (
                        <tr
                          key={row._id || i}
                          className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0F172A]">
                              {row.user?.name || row.name || '—'}
                            </p>
                            <p className="text-xs text-[#94A3B8]">{row.user?.phone || row.phone}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">{row.totalTransactions ?? '—'}</td>
                          <td className="px-4 py-3 font-mono font-medium text-[#0F172A]">
                            {formatCurrency(row.totalAmount)}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-[#7C3AED]">
                            {formatCurrency(row.totalCommission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="My Recharge Summary" />
            {myRechargeReport ? (
              <div className="space-y-2">
                {Object.entries(myRechargeReport).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between py-1.5 border-b border-[#E2E8F0] last:border-0 text-sm"
                  >
                    <span className="text-[#94A3B8] capitalize">
                      {k.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      {typeof v === 'number' && k.toLowerCase().includes('amount')
                        ? formatCurrency(v)
                        : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No data for this period</p>
            )}
          </Card>
          <Card>
            <CardHeader title="My Wallet Summary" />
            {myWalletReport ? (
              <div className="space-y-2">
                {Object.entries(myWalletReport).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between py-1.5 border-b border-[#E2E8F0] last:border-0 text-sm"
                  >
                    <span className="text-[#94A3B8] capitalize">
                      {k.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      {typeof v === 'number' ? formatCurrency(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No data for this period</p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
