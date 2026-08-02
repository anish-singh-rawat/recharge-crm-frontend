import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/api/settings'
import Card, { CardHeader } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { extractError } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'
import useAuthStore from '@/store/authStore'

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

  const handleSave = (key) => {
    setSaving((s) => ({ ...s, [key]: true }))
    updateMutation.mutate({ key, value: values[key] ?? settings?.[key] })
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
