import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { Plus, Copy, CheckCircle, BookOpen, Key, Globe, Shield, X, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiKeysApi } from '@/api/apiKeys'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDateTime, extractError } from '@/utils/format'
import { PERMISSIONS } from '@/utils/constants'
import { useIsReady } from '@/hooks/useIsReady'

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/

function CreateKeyModal({ open, onClose, onCreated }) {
  const [ipInput, setIpInput] = useState('')
  const [ipList, setIpList] = useState([])
  const [ipError, setIpError] = useState('')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', permissions: [], expiresAt: '' },
  })

  const addIp = () => {
    const ip = ipInput.trim()
    if (!ip) return
    if (!IP_REGEX.test(ip)) { setIpError('Invalid IP address format'); return }
    if (ipList.includes(ip)) { setIpError('IP already added'); return }
    setIpList((prev) => [...prev, ip])
    setIpInput('')
    setIpError('')
  }

  const removeIp = (ip) => setIpList((prev) => prev.filter((i) => i !== ip))

  const mutation = useMutation({
    mutationFn: (data) => apiKeysApi.createApiKey({
      ...data,
      permissions: data.permissions || [],
      expiresAt: data.expiresAt || null,
      allowedIps: ipList,
    }),
    onSuccess: (res) => {
      onCreated(res.data.data?.rawKey || res.data.data?.key?.rawKey)
      reset()
      setIpList([])
      setIpInput('')
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Create API Key" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label="Key Name" placeholder="Production Key" error={errors.name?.message} required {...register('name', { required: 'Name required' })} />

        <div>
          <label className="text-xs font-medium text-[#475569] block mb-1.5">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="permissions"
              control={control}
              render={({ field }) => (
                <>
                  {PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        value={perm}
                        checked={field.value?.includes(perm)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(field.value || []), perm]
                            : (field.value || []).filter((p) => p !== perm)
                          field.onChange(next)
                        }}
                        className="accent-[#2563EB]"
                      />
                      <span className="font-mono text-xs text-[#475569]">{perm}</span>
                    </label>
                  ))}
                </>
              )}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[#475569] block mb-1.5">
            Allowed IPs <span className="text-[#94A3B8] font-normal">(leave empty to allow all)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => { setIpInput(e.target.value); setIpError('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp())}
              placeholder="e.g. 203.0.113.1"
              className="flex-1 px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
            />
            <button
              type="button"
              onClick={addIp}
              className="px-3 py-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-sm font-medium hover:bg-[#DBEAFE] transition-colors"
            >
              Add
            </button>
          </div>
          {ipError && <p className="text-xs text-[#DC2626] mt-1">{ipError}</p>}
          {ipList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ipList.map((ip) => (
                <span key={ip} className="inline-flex items-center gap-1 px-2 py-1 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-xs font-mono rounded-lg">
                  <Shield size={10} />
                  {ip}
                  <button type="button" onClick={() => removeIp(ip)} className="text-[#94A3B8] hover:text-[#DC2626] ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8] mt-1.5 flex items-center gap-1">
              <Globe size={11} />
              All IP addresses will be allowed
            </p>
          )}
        </div>

        <Input label="Expires At (optional)" type="date" {...register('expiresAt')} />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>Create Key</Button>
        </div>
      </form>
    </Modal>
  )
}

function ManageIpsModal({ open, onClose, apiKey }) {
  const queryClient = useQueryClient()
  const [ipInput, setIpInput] = useState('')
  const [ipError, setIpError] = useState('')
  const [ipList, setIpList] = useState(apiKey?.allowedIps || [])

  const mutation = useMutation({
    mutationFn: (ips) => apiKeysApi.updateAllowedIps(apiKey._id, ips),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'IP whitelist updated')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const addIp = () => {
    const ip = ipInput.trim()
    if (!ip) return
    if (!IP_REGEX.test(ip)) { setIpError('Invalid IP address format (e.g. 203.0.113.1)'); return }
    if (ipList.includes(ip)) { setIpError('IP already in list'); return }
    setIpList((prev) => [...prev, ip])
    setIpInput('')
    setIpError('')
  }

  const removeIp = (ip) => setIpList((prev) => prev.filter((i) => i !== ip))

  return (
    <Modal open={open} onClose={onClose} title={`Manage IPs — ${apiKey?.name}`} size="md">
      <div className="space-y-4">
        <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#2563EB]">
          <p className="font-semibold mb-0.5">How IP whitelisting works</p>
          <p className="text-[#3B82F6]">If you add IPs, only those IPs can use this API key. Leave empty to allow all IP addresses.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-[#475569] block mb-1.5">Add IP Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => { setIpInput(e.target.value); setIpError('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp())}
              placeholder="e.g. 203.0.113.1"
              className="flex-1 px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
            />
            <button
              type="button"
              onClick={addIp}
              className="px-3 py-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-sm font-medium hover:bg-[#DBEAFE] transition-colors"
            >
              Add
            </button>
          </div>
          {ipError && <p className="text-xs text-[#DC2626] mt-1">{ipError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-[#475569]">
              Allowed IPs ({ipList.length})
            </label>
            {ipList.length > 0 && (
              <button
                type="button"
                onClick={() => setIpList([])}
                className="text-xs text-[#DC2626] hover:underline flex items-center gap-1"
              >
                <Trash2 size={11} />
                Remove all
              </button>
            )}
          </div>

          {ipList.length === 0 ? (
            <div className="flex items-center gap-2 p-3 border border-dashed border-[#E2E8F0] rounded-lg text-xs text-[#94A3B8]">
              <Globe size={14} />
              All IP addresses allowed (no restriction)
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ipList.map((ip) => (
                <div key={ip} className="flex items-center justify-between px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-[#2563EB]" />
                    <span className="font-mono text-sm text-[#0F172A]">{ip}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIp(ip)}
                    className="p-1 rounded hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            onClick={() => mutation.mutate(ipList)}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RawKeyModal({ open, onClose, rawKey }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(rawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Your New API Key" size="md">
      <div className="space-y-4">
        <div className="p-3 bg-[#FEF3C7] border border-[#D97706] rounded-lg text-sm text-[#92400E]">
          ⚠️ Copy this key now. It will never be shown again.
        </div>
        <div className="relative">
          <code className="block w-full p-3 bg-[#0F172A] text-[#22D3EE] text-xs rounded-lg font-mono break-all pr-10">
            {rawKey}
          </code>
          <button
            onClick={copy}
            className="absolute top-2 right-2 p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] transition-colors"
          >
            {copied ? <CheckCircle size={14} className="text-[#16A34A]" /> : <Copy size={14} />}
          </button>
        </div>
        <Button className="w-full" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}

export default function ApiKeys() {
  const queryClient = useQueryClient()
  const [createModal, setCreateModal] = useState(false)
  const [rawKey, setRawKey] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [manageIpsTarget, setManageIpsTarget] = useState(null)
  const ready = useIsReady()

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.getApiKeys(),
    select: (r) => r.data.data?.keys || r.data.data || [],
    enabled: ready,
  })

  const revokeMutation = useMutation({
    mutationFn: (id) => apiKeysApi.revokeApiKey(id),
    onSuccess: () => {
      toast.success('API key revoked')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setRevokeTarget(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">API Keys</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Manage programmatic access keys</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/api-docs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
          >
            <BookOpen size={15} />
            API Docs
          </Link>
          <Button leftIcon={<Plus size={16} />} onClick={() => setCreateModal(true)}>
            Create Key
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <Key size={16} className="text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">How to use your API key</p>
            <p className="text-xs text-[#475569] mt-0.5">
              Pass your API key in the <code className="bg-[#F1F5F9] px-1 rounded font-mono">X-Api-Key</code> request header when calling{' '}
              <code className="bg-[#F1F5F9] px-1 rounded font-mono">/api/v1/ext/*</code> endpoints.
              Read the <Link to="/api-docs" className="text-[#2563EB] hover:underline">API Documentation</Link> for the full guide.
            </p>
          </div>
        </div>
      </Card>

      {!keys?.length ? (
        <Card>
          <EmptyState
            title="No API keys"
            description="Create an API key for programmatic access"
            action={<Button size="sm" onClick={() => setCreateModal(true)}>Create Key</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key._id}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#0F172A]">{key.name}</p>
                    <Badge variant={key.isActive ? 'success' : 'danger'}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                    {key.keyPrefix ? `${key.keyPrefix}••••••••••••••••` : '••••••••'}
                  </p>

                  {key.permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {key.permissions.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-[10px] rounded font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2">
                    {key.allowedIps?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-[#475569] font-medium flex items-center gap-0.5">
                          <Shield size={10} className="text-[#2563EB]" />
                          IP whitelist:
                        </span>
                        {key.allowedIps.map((ip) => (
                          <span key={ip} className="px-1.5 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[10px] rounded font-mono">
                            {ip}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                        <Globe size={10} />
                        All IPs allowed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-[#94A3B8]">
                    <span>Created: {formatDateTime(key.createdAt)}</span>
                    {key.expiresAt && <span>Expires: {formatDateTime(key.expiresAt)}</span>}
                    {key.lastUsedAt && <span>Last used: {formatDateTime(key.lastUsedAt)}</span>}
                    {key.usageCount > 0 && <span>Used {key.usageCount}×</span>}
                  </div>
                </div>

                {key.isActive && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setManageIpsTarget(key)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                    >
                      <Shield size={13} />
                      Manage IPs
                    </button>
                    <Button variant="danger" size="sm" onClick={() => setRevokeTarget(key)}>
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateKeyModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={(key) => {
          setRawKey(key)
          queryClient.invalidateQueries({ queryKey: ['api-keys'] })
        }}
      />

      <RawKeyModal
        open={!!rawKey}
        onClose={() => setRawKey(null)}
        rawKey={rawKey}
      />

      {manageIpsTarget && (
        <ManageIpsModal
          open={!!manageIpsTarget}
          onClose={() => setManageIpsTarget(null)}
          apiKey={manageIpsTarget}
        />
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeMutation.mutate(revokeTarget._id)}
        title="Revoke API Key"
        message={`Revoke "${revokeTarget?.name}"? Any apps using this key will lose access immediately.`}
        confirmLabel="Revoke"
        loading={revokeMutation.isPending}
      />
    </div>
  )
}
