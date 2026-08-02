import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logsApi } from '@/api/logs'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatDateTime } from '@/utils/format'
import { FileText } from 'lucide-react'
import { useIsReady } from '@/hooks/useIsReady'

const TABS = [
  { key: 'activity', label: 'Activity Logs' },
  { key: 'audit', label: 'Audit Logs' },
  { key: 'webhooks', label: 'Webhook Logs' },
]

const SEVERITY_VARIANTS = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

export default function Logs() {
  const [tab, setTab] = useState('activity')
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('')
  const [severity, setSeverity] = useState('')
  const ready = useIsReady()

  const { data: activityData, isLoading: actLoading } = useQuery({
    queryKey: ['logs', 'activity', { page, module }],
    queryFn: () => logsApi.getActivityLogs({ page, limit: 20, ...(module && { module }) }),
    select: (r) => r.data.data,
    enabled: ready && tab === 'activity',
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['logs', 'audit', { page, severity }],
    queryFn: () => logsApi.getAuditLogs({ page, limit: 20, ...(severity && { severity }) }),
    select: (r) => r.data.data,
    enabled: ready && tab === 'audit',
  })

  const { data: webhookData, isLoading: webhookLoading } = useQuery({
    queryKey: ['logs', 'webhooks', { page }],
    queryFn: () => logsApi.getWebhookLogs({ page, limit: 20 }),
    select: (r) => r.data.data,
    enabled: ready && tab === 'webhooks',
  })

  const isLoading = actLoading || auditLoading || webhookLoading

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Logs</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Activity, audit, and webhook logs</p>
      </div>

      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); resetPage() }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <Card padding={false}>
          <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
            <CardHeader title="Activity Logs" />
            <select
              value={module}
              onChange={(e) => { setModule(e.target.value); resetPage() }}
              className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Modules</option>
              {['recharge', 'wallet', 'auth', 'users', 'operators'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !activityData?.items?.length ? (
            <EmptyState title="No activity logs" icon={FileText} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['User', 'Module', 'Action', 'IP', 'Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.items.map((log) => (
                      <tr key={log._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#0F172A]">{log.user?.name || '—'}</p>
                          <p className="text-xs text-[#94A3B8]">{log.user?.email}</p>
                        </td>
                        <td className="px-4 py-3"><Badge variant="primary">{log.module}</Badge></td>
                        <td className="px-4 py-3 text-[#475569]">{log.action}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{log.ipAddress || log.ip || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={activityData.pagination} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'audit' && (
        <Card padding={false}>
          <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
            <CardHeader title="Audit Logs" />
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); resetPage() }}
              className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Severities</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !auditData?.items?.length ? (
            <EmptyState title="No audit logs" icon={FileText} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['User', 'Action', 'Entity', 'Severity', 'Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.items.map((log) => (
                      <tr key={log._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#0F172A]">
                            {log.performedBy?.name || log.user?.name || '—'}
                          </p>
                          <p className="text-xs text-[#94A3B8]">{log.performedBy?.email || log.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#475569]">{log.action}</td>
                        <td className="px-4 py-3 text-[#475569]">
                          {log.targetModel || log.entityType || '—'}{' '}
                          <span className="font-mono text-xs">
                            {(log.target || log.entityId)?.toString().slice(-6)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={SEVERITY_VARIANTS[log.severity] || 'default'}>
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={auditData.pagination} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'webhooks' && (
        <Card padding={false}>
          <div className="p-4 border-b border-[#E2E8F0]">
            <CardHeader title="Webhook Logs" />
          </div>
          {isLoading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : !webhookData?.items?.length ? (
            <EmptyState title="No webhook logs" icon={FileText} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['Txn ID', 'Provider', 'Processed', 'Processed At', 'Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {webhookData.items.map((log) => (
                      <tr key={log._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-mono text-xs text-[#475569]">
                          {log.payload?.txnId?.slice(-10) || log.txnId?.slice(-10) || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">{log.provider || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={log.isProcessed ? 'success' : 'warning'}>
                            {log.isProcessed ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                          {log.processedAt ? formatDateTime(log.processedAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={webhookData.pagination} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}
    </div>
  )
}
