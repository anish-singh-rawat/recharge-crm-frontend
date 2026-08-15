import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Plus, Trash2, Search, X, Flame, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { operatorsApi } from '@/api/operators'
import Card, { CardHeader } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { extractError } from '@/utils/format'
import { useIsReady } from '@/hooks/useIsReady'

const PLAN_TYPES = [
  { value: 'TOPUP', label: 'Top-up' },
  { value: 'DATA', label: 'Data' },
  { value: 'ANNUAL', label: 'Annual' },
]

const planSchema = z.object({
  amount:      z.string().refine((v) => Number(v) > 0, 'Enter a valid amount'),
  validity:    z.string().optional(),
  dataAmount:  z.string().optional(),
  description: z.string().min(1, 'Description required'),
  smsCount:    z.string().optional(),
  talktime:    z.string().optional(),
  planType:    z.string().optional(),
  isPopular:   z.boolean().optional(),
  circle:      z.string().min(1, 'Circle required'),
})

function AddPlanModal({ open, onClose, operatorId, circles }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: { planType: 'TOPUP', isPopular: false },
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      operatorsApi.createPlan({
        operator:    operatorId,
        circle:      data.circle,
        amount:      Number(data.amount),
        validity:    data.validity || '',
        dataAmount:  data.dataAmount || '',
        description: data.description,
        smsCount:    data.smsCount ? Number(data.smsCount) : 0,
        talktime:    data.talktime ? Number(data.talktime) : 0,
        planType:    data.planType || 'TOPUP',
        isPopular:   data.isPopular || false,
      }),
    onSuccess: () => {
      toast.success('Plan added')
      queryClient.invalidateQueries({ queryKey: ['operator-plans', operatorId] })
      reset({ planType: 'TOPUP', isPopular: false })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const circleOptions = circles.map((c) => ({ value: c._id, label: c.name }))

  return (
    <Modal open={open} onClose={onClose} title="Add Plan" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Select
          label="Circle"
          options={circleOptions}
          placeholder="Select circle"
          error={errors.circle?.message}
          required
          {...register('circle')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="199"
            error={errors.amount?.message}
            required
            {...register('amount')}
          />
          <Input
            label="Validity"
            placeholder="28 Days"
            {...register('validity')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            placeholder="1.5GB/day"
            {...register('dataAmount')}
          />
          <Select
            label="Plan Type"
            options={PLAN_TYPES}
            {...register('planType')}
          />
        </div>
        <Input
          label="Description"
          placeholder="1.5GB/day, Unlimited Calling, Jio Apps"
          error={errors.description?.message}
          required
          {...register('description')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="SMS Count" type="number" placeholder="100" {...register('smsCount')} />
          <Input label="Talktime" type="number" placeholder="0" {...register('talktime')} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="accent-[#F59E0B]" {...register('isPopular')} />
          <Flame size={13} className="text-[#F59E0B]" />
          <span className="text-[#475569]">Mark as Popular</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>Add Plan</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OperatorPlans() {
  const { id: operatorId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ready = useIsReady()

  const [search, setSearch]         = useState('')
  const [circleFilter, setCircleFilter] = useState('')
  const [addModal, setAddModal]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const { data: operator } = useQuery({
    queryKey: ['operator', operatorId],
    queryFn: () => operatorsApi.getOperatorById(operatorId),
    select: (r) => r.data.data?.operator || r.data.data,
    enabled: ready && !!operatorId,
  })

  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => operatorsApi.getCircles(),
    select: (r) => {
      const d = r.data.data
      if (Array.isArray(d?.circles)) return d.circles
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.items)) return d.items
      return []
    },
    enabled: ready,
  })

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ['operator-plans', operatorId],
    queryFn: () => operatorsApi.getPlans({ operator: operatorId, limit: 1000 }),
    select: (r) => {
      const d = r.data.data
      return Array.isArray(d?.items) ? d.items : []
    },
    enabled: ready && !!operatorId,
  })

  const circleOptions = circles.map((c) => ({ value: c._id, label: c.name }))

  const filtered = useMemo(() => {
    let list = allPlans
    if (circleFilter) list = list.filter((p) => p.circle?._id === circleFilter || p.circle === circleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        String(p.amount).includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.validity?.toLowerCase().includes(q) ||
        p.dataAmount?.toLowerCase().includes(q),
      )
    }
    return list
  }, [allPlans, circleFilter, search])

  const deleteMutation = useMutation({
    mutationFn: (planId) => operatorsApi.deletePlan(planId),
    onSuccess: () => {
      toast.success('Plan deleted')
      queryClient.invalidateQueries({ queryKey: ['operator-plans', operatorId] })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const clearMutation = useMutation({
    mutationFn: () => operatorsApi.deleteAllPlansByOperator(operatorId),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.data.data?.deletedCount ?? 0} plans`)
      queryClient.invalidateQueries({ queryKey: ['operator-plans', operatorId] })
      setClearConfirm(false)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const circleMap = useMemo(() => {
    const m = {}
    circles.forEach((c) => { m[c._id] = c.name })
    return m
  }, [circles])

  const getCircleName = (plan) =>
    plan.circle?.name || circleMap[plan.circle] || '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/operators')}
          className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#475569] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#0F172A] truncate">
            {operator?.name || 'Operator'} — Plans
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            {allPlans.length} active plan{allPlans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allPlans.length > 0 && (
            <button
              onClick={() => setClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FCA5A5] bg-[#FFF5F5] text-[#DC2626] text-sm font-medium hover:bg-[#FEE2E2] transition-colors"
            >
              <Trash2 size={14} />
              Delete All
            </button>
          )}
          <Button leftIcon={<Plus size={15} />} onClick={() => setAddModal(true)}>
            Add Plan
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search amount, validity, data…"
              className="w-full pl-8 pr-8 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#F8FAFC]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                <X size={13} />
              </button>
            )}
          </div>
          <select
            value={circleFilter}
            onChange={(e) => setCircleFilter(e.target.value)}
            className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#F8FAFC]"
          >
            <option value="">All Circles</option>
            {circles.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          {(search || circleFilter) && (
            <span className="text-xs text-[#94A3B8]">
              {filtered.length} of {allPlans.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search || circleFilter ? 'No plans match your filter' : 'No plans yet'}
            description={!search && !circleFilter ? `Add plans for ${operator?.name || 'this operator'}` : undefined}
            action={
              !search && !circleFilter
                ? <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddModal(true)}>Add Plan</Button>
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {['Amount', 'Validity', 'Data', 'Description', 'SMS', 'Type', 'Circle', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((plan) => (
                  <tr key={plan._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0F172A]">₹{plan.amount}</span>
                        {plan.isPopular && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-semibold">
                            <Flame size={9} />
                            Popular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{plan.validity || '—'}</td>
                    <td className="px-4 py-3 text-[#475569]">{plan.dataAmount || '—'}</td>
                    <td className="px-4 py-3 text-[#475569] max-w-[220px] truncate">{plan.description || '—'}</td>
                    <td className="px-4 py-3 text-[#475569]">{plan.smsCount > 0 ? plan.smsCount : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{plan.planType || 'TOPUP'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#475569] whitespace-nowrap">{getCircleName(plan)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(plan)}
                        className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddPlanModal
        open={addModal}
        onClose={() => setAddModal(false)}
        operatorId={operatorId}
        circles={circles}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Plan"
        message={`Permanently delete the ₹${deleteTarget?.amount} plan? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={() => clearMutation.mutate()}
        title="Delete All Plans"
        message={`Permanently delete all ${allPlans.length} plans for ${operator?.name || 'this operator'}? This cannot be undone.`}
        confirmLabel="Delete All"
        loading={clearMutation.isPending}
      />
    </div>
  )
}
