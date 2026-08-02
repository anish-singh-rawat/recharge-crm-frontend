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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { reportsApi } from '@/api/reports'
import Card, { CardHeader } from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatNumber } from '@/utils/format'
import useAuthStore from '@/store/authStore'
import { STATUS_COLORS } from '@/utils/constants'

const COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#7C3AED']

export default function Reports() {
  const { isAdmin } = useAuthStore()
  const admin = isAdmin()

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

  const { data: salesByDay, isLoading: byDayLoading } = useQuery({
    queryKey: ['reports', 'sales-by-day', dateRange],
    queryFn: () => reportsApi.getSalesByDay(dateRange),
    select: (r) => r.data.data || [],
    enabled: admin,
  })

  const { data: salesByOperator } = useQuery({
    queryKey: ['reports', 'sales-by-operator'],
    queryFn: () => reportsApi.getSalesByOperator(dateRange),
    select: (r) => r.data.data || [],
    enabled: admin,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Reports</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Analytics and performance metrics</p>
        </div>
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
      </div>

      {admin ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Sales"
              value={formatCurrency(summary.totalAmount)}
              icon={<span className="text-base">₹</span>}
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
                      <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip formatter={(v) => [formatCurrency(v), 'Amount']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                      <Line type="monotone" dataKey="totalAmount" stroke="#2563EB" strokeWidth={2} dot={false} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <YAxis type="category" dataKey="_id" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={60} />
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Amount']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="My Recharge Summary" />
            {myRechargeReport ? (
              <div className="space-y-2">
                {Object.entries(myRechargeReport).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-[#E2E8F0] last:border-0 text-sm">
                    <span className="text-[#94A3B8] capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      {typeof v === 'number' && k.toLowerCase().includes('amount') ? formatCurrency(v) : v}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No data</p>
            )}
          </Card>
          <Card>
            <CardHeader title="My Wallet Summary" />
            {myWalletReport ? (
              <div className="space-y-2">
                {Object.entries(myWalletReport).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-[#E2E8F0] last:border-0 text-sm">
                    <span className="text-[#94A3B8] capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-mono font-medium text-[#0F172A]">
                      {typeof v === 'number' ? formatCurrency(v) : v}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No data</p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
