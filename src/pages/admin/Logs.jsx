import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logsApi } from '@/api/logs'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { formatDateTime, extractError } from '@/utils/format'
import { FileText, Trash2, AlertTriangle, X } from 'lucide-react'
import { useIsReady } from '@/hooks/useIsReady'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'activity', label: 'Activity Logs' },
  { key: 'audit',    label: 'Audit Logs'    },
  { key: 'webhooks', label: 'Webhook Logs'  },
]

const SEVERITY_VARIANTS = {
  LOW:      'default',
  MEDIUM:   'warning',
  HIGH:     'danger',
  CRITICAL: 'danger',
}


function ConfirmDeleteModal({ target, onConfirm, onCancel, isDeleting }) {
  const labels = {
    activity: 'all Activity Logs',
    audit:    'all Audit Logs',
    webhooks: 'all Webhook Logs',
    all:      'ALL Logs (Activity + Audit + Webhook)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#475569] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FEE2E2] mx-auto mb-4">
          <AlertTriangle size={22} className="text-[#DC2626]" />
        </div>

        <h2 className="text-lg font-bold text-[#0F172A] text-center mb-2">
          Delete {labels[target]}?
        </h2>
        <p className="text-sm text-[#475569] text-center mb-6">
          This action is permanent and cannot be undone. All selected log records will be deleted from the database.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#DC2626] text-white text-sm font-medium hover:bg-[#B91C1C] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Yes, Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


function DeleteButton({ onClick, label = 'Clear Logs' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FCA5A5] bg-[#FFF5F5] text-[#DC2626] text-xs font-medium hover:bg-[#FEE2E2] transition-colors"
    >
      <Trash2 size={13} />
      {label}
    </button>
  )
}


export default function Logs() {
  const queryClient = useQueryClient()
  const ready = useIsReady()

  const [tab,      setTab]      = useState('activity')
  const [page,     setPage]     = useState(1)
  const [module,   setModule]   = useState('')
  const [severity, setSeverity] = useState('')

  const [confirmTarget, setConfirmTarget] = useState(null)
    
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

  
  const deleteMutation = useMutation({
    mutationFn: (target) => {
      if (target === 'activity') return logsApi.deleteActivityLogs()
      if (target === 'audit')    return logsApi.deleteAuditLogs()
      if (target === 'webhooks') return logsApi.deleteWebhookLogs()
      return logsApi.deleteAllLogs()
    },
    onSuccess: (res, target) => {
      const data = res.data?.data
      const msg =
        target === 'all'
          ? `Deleted ${data?.totalDeleted ?? 0} logs total`
          : `Deleted ${data?.deletedCount ?? 0} logs`
      toast.success(msg)
      setConfirmTarget(null)
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setPage(1)
    },
    onError: (err) => {
      toast.error(extractError(err))
      setConfirmTarget(null)
    },
  })

  const resetPage = () => setPage(1)

  return (
    <>
      {/* ── Confirm modal ─────────────────────────────────────────────── */}
      {confirmTarget && (
        <ConfirmDeleteModal
          target={confirmTarget}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmTarget)}
          onCancel={() => !deleteMutation.isPending && setConfirmTarget(null)}
        />
      )}

      <div className="space-y-6">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Logs</h1>
            <p className="text-sm text-[#94A3B8] mt-0.5">Activity, audit, and webhook logs</p>
          </div>
          {/* Delete ALL button — always visible */}
          <DeleteButton
            label="Delete All Logs"
            onClick={() => setConfirmTarget('all')}
          />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-lg w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); resetPage() }}
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

        {/* ── Activity Logs ─────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <Card padding={false}>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
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
              <DeleteButton onClick={() => setConfirmTarget('activity')} />
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
                      {activityData.items.map((log) => (
                        <tr key={log._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0F172A]">{log.user?.name || '—'}</p>
                            <p className="text-xs text-[#94A3B8]">{log.user?.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="primary">{log.module}</Badge>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{log.action}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">
                            {log.ipAddress || log.ip || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
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

        {/* ── Audit Logs ────────────────────────────────────────────────── */}
        {tab === 'audit' && (
          <Card padding={false}>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
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
              <DeleteButton onClick={() => setConfirmTarget('audit')} />
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
                      {auditData.items.map((log) => (
                        <tr key={log._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0F172A]">
                              {log.performedBy?.name || log.user?.name || '—'}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              {log.performedBy?.email || log.user?.email}
                            </p>
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
                          <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
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

        {/* ── Webhook Logs ──────────────────────────────────────────────── */}
        {tab === 'webhooks' && (
          <Card padding={false}>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
              <CardHeader title="Webhook Logs" />
              <DeleteButton onClick={() => setConfirmTarget('webhooks')} />
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
                          <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
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
    </>
  )
}
