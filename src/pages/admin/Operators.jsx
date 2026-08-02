import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { extractError } from '@/utils/format'
import { RECHARGE_TYPES } from '@/utils/constants'
import { useIsReady } from '@/hooks/useIsReady'

const operatorSchema = z.object({
  name: z.string().min(1, 'Name required'),
  code: z.string().min(1, 'Code required'),
  type: z.string().min(1, 'Type required'),
  providerCode: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  commission: z.string().optional(),
})

function OperatorModal({ open, onClose, initial }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(operatorSchema),
    defaultValues: initial || { type: 'MOBILE_PREPAID' },
  })

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        minAmount: data.minAmount ? Number(data.minAmount) : undefined,
        maxAmount: data.maxAmount ? Number(data.maxAmount) : undefined,
        commission: data.commission ? Number(data.commission) : undefined,
      }
      return initial
        ? operatorsApi.updateOperator(initial._id, payload)
        : operatorsApi.createOperator(payload)
    },
    onSuccess: () => {
      toast.success(`Operator ${initial ? 'updated' : 'created'}`)
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Operator' : 'Add Operator'} size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" placeholder="Airtel" error={errors.name?.message} required {...register('name')} />
          <Input label="Code" placeholder="AIRTEL" error={errors.code?.message} required {...register('code')} />
        </div>
        <Select label="Type" options={RECHARGE_TYPES} error={errors.type?.message} required {...register('type')} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Min Amount" type="number" placeholder="10" {...register('minAmount')} />
          <Input label="Max Amount" type="number" placeholder="5000" {...register('maxAmount')} />
          <Input label="Commission (%)" type="number" placeholder="2" {...register('commission')} />
        </div>
        <Input label="Provider Code" placeholder="AIRTEL" {...register('providerCode')} />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>
            {initial ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const planSchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, 'Amount required'),
  description: z.string().min(1, 'Description required'),
  validity: z.string().optional(),
  operator: z.string().min(1, 'Operator required'),
  circle: z.string().optional(),
})

function PlanModal({ open, onClose, initial, operatorOptions, circleOptions }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: initial || {},
  })

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, amount: Number(data.amount), validity: data.validity ? Number(data.validity) : undefined }
      return initial ? operatorsApi.updatePlan(initial._id, payload) : operatorsApi.createPlan(payload)
    },
    onSuccess: () => {
      toast.success(`Plan ${initial ? 'updated' : 'created'}`)
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Plan' : 'Add Plan'} size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Select label="Operator" options={operatorOptions} placeholder="Select operator" error={errors.operator?.message} required {...register('operator')} />
        <Select label="Circle" options={circleOptions} placeholder="All circles" {...register('circle')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (₹)" type="number" placeholder="199" error={errors.amount?.message} required {...register('amount')} />
          <Input label="Validity (days)" type="number" placeholder="28" {...register('validity')} />
        </div>
        <Input label="Description" placeholder="Unlimited calls + 1.5GB/day" error={errors.description?.message} required {...register('description')} />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>{initial ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Operators() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('operators')
  const [opPage, setOpPage] = useState(1)
  const [planPage, setPlanPage] = useState(1)
  const [opModal, setOpModal] = useState(null)
  const [planModal, setPlanModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const ready = useIsReady()

  const { data: operators, isLoading: opLoading } = useQuery({
    queryKey: ['operators', { page: opPage }],
    queryFn: () => operatorsApi.getOperators({ page: opPage, limit: 20 }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const { data: circles = [] } = useQuery({
    queryKey: ['circles'],
    queryFn: () => operatorsApi.getCircles(),
    select: (r) => r.data.data || [],
    enabled: ready,
  })

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans', { page: planPage }],
    queryFn: () => operatorsApi.getPlans({ page: planPage, limit: 20 }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) =>
      type === 'operator' ? operatorsApi.deleteOperator(id) : operatorsApi.deletePlan(id),
    onSuccess: (_, vars) => {
      toast.success(`${vars.type === 'operator' ? 'Operator' : 'Plan'} deactivated`)
      queryClient.invalidateQueries({ queryKey: [vars.type === 'operator' ? 'operators' : 'plans'] })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const operatorOptions = (operators?.items || []).map((o) => ({ value: o._id, label: o.name }))
  const circleOptions = circles.map((c) => ({ value: c._id, label: c.name }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Operators & Plans</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Manage operators, circles, and plans</p>
        </div>
        <Button
          leftIcon={<Plus size={16} />}
          onClick={() => tab === 'operators' ? setOpModal({}) : setPlanModal({})}
        >
          Add {tab === 'operators' ? 'Operator' : 'Plan'}
        </Button>
      </div>

      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-lg w-fit">
        {['operators', 'plans'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'operators' ? (
        <Card padding={false}>
          {opLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !operators?.items?.length ? (
            <EmptyState title="No operators" action={<Button size="sm" onClick={() => setOpModal({})}>Add Operator</Button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['Name', 'Code', 'Type', 'Min', 'Max', 'Commission', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operators.items.map((op) => (
                      <tr key={op._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-medium text-[#0F172A]">{op.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#475569]">{op.code}</td>
                        <td className="px-4 py-3"><Badge variant="primary">{op.type}</Badge></td>
                        <td className="px-4 py-3 text-[#475569]">₹{op.minAmount || '—'}</td>
                        <td className="px-4 py-3 text-[#475569]">₹{op.maxAmount || '—'}</td>
                        <td className="px-4 py-3 text-[#475569]">{op.commission ? `${op.commission}%` : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setOpModal(op)} className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#475569] transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget({ type: 'operator', id: op._id, name: op.name })} className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={operators.pagination} onPageChange={setOpPage} />
            </>
          )}
        </Card>
      ) : (
        <Card padding={false}>
          {plansLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !plans?.items?.length ? (
            <EmptyState title="No plans" action={<Button size="sm" onClick={() => setPlanModal({})}>Add Plan</Button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {['Amount', 'Operator', 'Circle', 'Validity', 'Description', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.items.map((plan) => (
                      <tr key={plan._id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">₹{plan.amount}</td>
                        <td className="px-4 py-3 text-[#475569]">{plan.operator?.name || '—'}</td>
                        <td className="px-4 py-3 text-[#475569]">{plan.circle?.name || 'All'}</td>
                        <td className="px-4 py-3 text-[#475569]">{plan.validity ? `${plan.validity}d` : '—'}</td>
                        <td className="px-4 py-3 text-[#475569] max-w-[200px] truncate">{plan.description}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setPlanModal(plan)} className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#475569]"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget({ type: 'plan', id: plan._id, name: `₹${plan.amount} plan` })} className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626]"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={plans.pagination} onPageChange={setPlanPage} />
            </>
          )}
        </Card>
      )}

      <OperatorModal
        open={!!opModal && tab === 'operators'}
        onClose={() => setOpModal(null)}
        initial={opModal?._id ? opModal : null}
      />
      <PlanModal
        open={!!planModal && tab === 'plans'}
        onClose={() => setPlanModal(null)}
        initial={planModal?._id ? planModal : null}
        operatorOptions={operatorOptions}
        circleOptions={circleOptions}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title={`Deactivate ${deleteTarget?.type === 'operator' ? 'Operator' : 'Plan'}`}
        message={`Deactivate "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
