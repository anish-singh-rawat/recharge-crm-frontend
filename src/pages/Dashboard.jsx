import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Zap, DollarSign, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { rechargeApi } from '@/api/recharge'
import StatCard from '@/components/ui/StatCard'
import Card, { CardHeader } from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDateTime } from '@/utils/format'
import useAuthStore from '@/store/authStore'
import { STATUS_COLORS } from '@/utils/constants'

const PIE_COLORS = ['#16A34A', '#DC2626', '#D97706', '#2563EB', '#0891B2', '#7C3AED']

export default function Dashboard() {
  const { isAdmin, user } = useAuthStore()
  const admin = isAdmin()

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsApi.getDashboard(),
    select: (r) => r.data.data,
  })

  const { data: recentTxns } = useQuery({
    queryKey: ['recharge', admin ? 'all' : 'my', { page: 1, limit: 5 }],
    queryFn: () =>
      admin
        ? rechargeApi.getAllTransactions({ page: 1, limit: 5 })
        : rechargeApi.getMyTransactions({ page: 1, limit: 5 }),
    select: (r) => r.data.data?.items || [],
  })

  const { data: salesByDay } = useQuery({
    queryKey: ['reports', 'sales-by-day'],
    queryFn: () => reportsApi.getSalesByDay({}),
    select: (r) => r.data.data || [],
    enabled: admin,
  })

  if (isLoading) return <PageLoader />

  const today = dashData?.today || {}
  const allTime = dashData?.allTime || {}
  const statusBreakdown = dashData?.statusBreakdown || []

  const pieData = statusBreakdown.map((s) => ({
    name: s._id,
    value: s.count,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Welcome back, {user?.name?.split(' ')[0]}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Transactions"
          value={today.totalTransactions ?? 0}
          icon={<Zap size={20} />}
          iconBg="bg-[#DBEAFE]"
          iconColor="text-[#2563EB]"
        />
        <StatCard
          title="Today's Amount"
          value={formatCurrency(today.totalAmount)}
          icon={<DollarSign size={20} />}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-[#16A34A]"
        />
        <StatCard
          title="All Time Transactions"
          value={formatCurrency(allTime.totalAmount)}
          subtitle={`${allTime.totalTransactions ?? 0} transactions`}
          icon={<TrendingUp size={20} />}
          iconBg="bg-[#EDE9FE]"
          iconColor="text-[#7C3AED]"
        />
        <StatCard
          title="Today's Success"
          value={today.successCount ?? 0}
          subtitle={`of ${today.totalTransactions ?? 0} total`}
          icon={<CheckCircle size={20} />}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-[#16A34A]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {admin && salesByDay?.length > 0 && (
          <Card className="lg:col-span-2" padding={false}>
            <div className="p-5">
              <CardHeader title="Sales by Day" subtitle="Last 30 days" />
            </div>
            <div className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesByDay}>
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
                  <Bar dataKey="totalAmount" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader title="Status Breakdown" />
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        STATUS_COLORS[entry.name]?.text ||
                        PIE_COLORS[index % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <Card padding={false}>
        <div className="p-5 border-b border-[#E2E8F0]">
          <CardHeader title="Recent Transactions" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                  Txn ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                  Mobile
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTxns?.length ? (
                recentTxns.map((txn) => (
                  <tr
                    key={txn._id}
                    className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#475569]">
                      {txn.txnId?.slice(-8) || txn._id?.slice(-8)}
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]">{txn.mobileNumber}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#0F172A]">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94A3B8]">
                      {formatDateTime(txn.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
