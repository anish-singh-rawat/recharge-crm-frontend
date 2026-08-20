import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCheck, ArrowUp, ArrowDown, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/api/settings'
import Card, { CardHeader } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { extractError } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'
import useAuthStore from '@/store/authStore'

const PROVIDERS = [
  {
    id: 'mrobotics',
    label: 'MRobotics',
    description: 'Primary recharge API',
    color: 'bg-[#DBEAFE] text-[#2563EB]',
  },
  {
    id: 'realrobo',
    label: 'RealRobo',
    description: 'Secondary recharge API',
    color: 'bg-[#DCFCE7] text-[#16A34A]',
  },
]

function ProviderPriorityCard({ priority, onSave, saving }) {
  const [order, setOrder] = useState(priority || ['mrobotics'])

  useEffect(() => {
    if (priority) setOrder(priority)
  }, [priority])

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setOrder(next)
  }

  const moveDown = (idx) => {
    if (idx === order.length - 1) return
    const next = [...order]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setOrder(next)
  }

  const toggleProvider = (id) => {
    if (order.includes(id)) {
      if (order.length === 1) {
        toast.error('At least one provider must be active')
        return
      }
      setOrder(order.filter((p) => p !== id))
    } else {
      setOrder([...order, id])
    }
  }

  return (
    <Card>
      <CardHeader
        title="Recharge Provider Priority"
        subtitle="First provider is tried first. On failure, next provider is attempted automatically."
        icon={<Zap size={16} className="text-[#2563EB]" />}
      />

      <div className="mt-4 space-y-2">
        {order.map((providerId, idx) => {
          const meta = PROVIDERS.find((p) => p.id === providerId)
          return (
            <div
              key={providerId}
              className="flex items-center gap-3 p-3 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#E2E8F0] text-xs font-bold text-[#475569] shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.color || 'bg-[#F1F5F9] text-[#475569]'}`}>
                  {meta?.label || providerId}
                </span>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">{meta?.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-[#DBEAFE] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#2563EB]"
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === order.length - 1}
                  className="p-1.5 rounded hover:bg-[#DBEAFE] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#2563EB]"
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3">
        <p className="text-[11px] text-[#94A3B8] mb-2">Available providers:</p>
        <div className="flex gap-2 flex-wrap">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProvider(p.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                order.includes(p.id)
                  ? 'border-[#2563EB] bg-[#DBEAFE] text-[#2563EB]'
                  : 'border-[#E2E8F0] bg-white text-[#94A3B8] hover:border-[#CBD5E1]'
              }`}
            >
              {order.includes(p.id) ? '✓' : '+'} {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex justify-end">
        <Button
          size="sm"
          leftIcon={<Save size={14} />}
          loading={saving}
          onClick={() => onSave('recharge.provider.priority', order)}
        >
          Save Priority
        </Button>
      </div>
    </Card>
  )
}

const SETTING_GROUPS = [
  {
    label: 'Application',
    keys: ['app.maintenanceMode', 'app.supportEmail', 'app.appName'],
  },
  {
    label: 'Wallet',
    keys: [
      'wallet.commissionRate',
      'wallet.minRechargeAmount',
      'wallet.maxRechargeAmount',
    ],
  },
]

export default function Settings() {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuthStore()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState({})
  const ready = useIsReady()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'all'],
    queryFn: () => settingsApi.getAllSettings({ limit: 50 }),
    select: (r) => {
      const d = r.data.data
      const items = d?.items || (Array.isArray(d) ? d : [])
      const map = {}
      items.forEach((s) => { map[s.key] = s.value })
      return map
    },
    enabled: ready,
  })

  useEffect(() => {
    if (settings) setValues(settings)
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => settingsApi.updateSetting(key, value),
    onSuccess: (_, vars) => {
      toast.success(`Setting "${vars.key}" updated`)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSaving((s) => ({ ...s, [vars.key]: false }))
    },
    onError: (err, vars) => {
      toast.error(extractError(err))
      setSaving((s) => ({ ...s, [vars.key]: false }))
    },
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: () =>
      settingsApi.bulkUpdateSettings(
        Object.entries(values).map(([key, value]) => ({ key, value }))
      ),
    onSuccess: () => {
      toast.success('All settings saved')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleSave = (key, overrideValue) => {
    const value = overrideValue !== undefined ? overrideValue : (values[key] ?? settings?.[key])
    setSaving((s) => ({ ...s, [key]: true }))
    updateMutation.mutate({ key, value })
  }

  if (isLoading) return <PageLoader />

  const currentValues = { ...settings, ...values }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Configure application settings</p>
      </div>

      {isSuperAdmin() && Object.keys(values).length > 0 && (
        <div className="flex justify-end">
          <Button
            leftIcon={<CheckCheck size={15} />}
            onClick={() => bulkUpdateMutation.mutate()}
            loading={bulkUpdateMutation.isPending}
          >
            Save All
          </Button>
        </div>
      )}

      {SETTING_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader title={group.label} />
          <div className="space-y-4">
            {group.keys.map((key) => (
              <div key={key} className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label={key}
                    value={currentValues[key] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [key]: e.target.value }))
                    }
                    placeholder="Value"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={saving[key]}
                  leftIcon={<Save size={14} />}
                  onClick={() => handleSave(key)}
                >
                  Save
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <ProviderPriorityCard
        priority={currentValues['recharge.provider.priority']}
        saving={saving['recharge.provider.priority']}
        onSave={handleSave}
      />

      <Card>
        <CardHeader title="All Settings" subtitle="Raw settings view" />
        <div className="divide-y divide-[#E2E8F0]">
          {Object.entries(currentValues).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="font-mono text-xs text-[#475569]">{key}</span>
              <div className="flex items-center gap-2">
                <input
                  value={currentValues[key] ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [key]: e.target.value }))
                  }
                  className="text-sm border border-[#E2E8F0] rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
                <button
                  onClick={() => handleSave(key)}
                  className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
                  title="Save"
                >
                  <Save size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
