import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Search, Ban, CheckCircle, Trash2, Eye, Pencil, ToggleLeft, ToggleRight, Percent, Phone, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
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
import { formatDateTime, extractError, getInitials } from '@/utils/format'
import { USER_ROLES } from '@/utils/constants'
import useAuthStore from '@/store/authStore'
import { useIsReady } from '@/hooks/useIsReady'

const createSchema = z
  .object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Invalid email'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Weak password'),
    confirmPassword: z.string(),
    role: z.string().min(1, 'Role required'),
    businessName: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const editSchema = z.object({
  name: z.string().min(2, 'Name required'),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
})

function CreateUserModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuthStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(createSchema) })

  const mutation = useMutation({
    mutationFn: (data) => usersApi.createUser(data),
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const roles = isSuperAdmin()
    ? USER_ROLES
    : USER_ROLES.filter((r) => r.value === 'retailer')

  return (
    <Modal open={open} onClose={onClose} title="Create User" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Full Name"
            placeholder="Rahul Sharma"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input
            label="Business Name"
            placeholder="Sharma Telecom"
            {...register('businessName')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            placeholder="rahul@example.com"
            error={errors.email?.message}
            required
            {...register('email')}
          />
          <Input
            label="Phone"
            placeholder="9876543210"
            error={errors.phone?.message}
            required
            {...register('phone')}
          />
        </div>
        <Select
          label="Role"
          options={roles}
          placeholder="Select role"
          error={errors.role?.message}
          required
          {...register('role')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 chars"
            error={errors.password?.message}
            required
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter"
            error={errors.confirmPassword?.message}
            required
            {...register('confirmPassword')}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({ open, onClose, user }) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSchema),
    values: user
      ? {
        name: user.name || '',
        businessName: user.businessName || '',
        gstNumber: user.gstNumber || '',
        panNumber: user.panNumber || '',
      }
      : {},
  })

  const mutation = useMutation({
    mutationFn: (data) => usersApi.updateUser(user._id, data),
    onSuccess: () => {
      toast.success('User updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Edit User" size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          label="Full Name"
          error={errors.name?.message}
          required
          {...register('name')}
        />
        <Input label="Business Name" {...register('businessName')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="GST Number" placeholder="27AAPFU0939F1ZV" {...register('gstNumber')} />
          <Input label="PAN Number" placeholder="AAPFU0939F" {...register('panNumber')} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Operator-wise Commission Modal ──────────────────────────────────────────
function OperatorCommissionModal({ user, onClose, onSave, isSaving }) {
  // rows = [{ operatorId: string, percent: string }]
  const [rows, setRows] = useState([{ operatorId: '', percent: '' }])

  // Load operators via the active-operators endpoint
  const { data: operators = [], isLoading: loadingOperators } = useQuery({
    queryKey: ['active-operators-all'],
    queryFn: () => operatorsApi.getActiveOperators(),
    select: (r) => r.data.data?.operators || [],
    staleTime: 5 * 60 * 1000,
  })

  // Pre-fill rows from saved operatorCommissions when modal opens / user changes
  useEffect(() => {
    if (!user) return
    const saved = user.operatorCommissions || []
    if (saved.length > 0) {
      setRows(
        saved.map((oc) => ({
          operatorId: oc.operator?._id || oc.operator || '',
          percent: (oc.rate * 100).toFixed(2),
        }))
      )
    } else {
      setRows([{ operatorId: '', percent: '' }])
    }
  }, [user])

  const globalRate = user ? ((user.commissionRate || 0) * 100).toFixed(2) : '0.00'

  // Operators already selected in other rows (for disabling duplicates)
  const selectedIds = rows.map((r) => r.operatorId).filter(Boolean)

  const addRow = () => setRows((prev) => [...prev, { operatorId: '', percent: '' }])

  const removeRow = (idx) =>
    setRows((prev) => prev.length === 1 ? [{ operatorId: '', percent: '' }] : prev.filter((_, i) => i !== idx))

  const updateRow = (idx, field, value) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))

  const handleSave = () => {
    const validRows = rows.filter((r) => r.operatorId && r.percent !== '')
    if (validRows.length === 0) {
      // Saving empty = clear all operator-specific commissions
      onSave([])
      return
    }
    const commissions = validRows.map((r) => ({
      operatorId: r.operatorId,
      rate: parseFloat(r.percent) / 100,
    }))
    onSave(commissions)
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Operator-wise Commission — ${user?.name || ''}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Subtitle */}
        <p className="text-sm text-[#475569]">
          Set a custom commission for each operator for{' '}
          <strong>{user?.name}</strong>. Operators not listed here will use
          the global rate{' '}
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#EDE9FE] text-[#7C3AED] rounded text-xs font-mono font-semibold">
            {globalRate}%
          </span>
          .
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-1">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Operator</span>
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide w-28 text-right pr-6">Commission %</span>
          <span className="w-7" />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {loadingOperators ? (
            <div className="py-8 text-center text-sm text-[#94A3B8]">Loading operators…</div>
          ) : (
            rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                {/* Operator dropdown */}
                <select
                  value={row.operatorId}
                  onChange={(e) => updateRow(idx, 'operatorId', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-[#0F172A]"
                >
                  <option value="">— Select Operator —</option>
                  {operators.map((op) => (
                    <option
                      key={op._id}
                      value={op._id}
                      disabled={selectedIds.includes(op._id) && op._id !== row.operatorId}
                    >
                      {op.displayName || op.name} ({op.code})
                    </option>
                  ))}
                </select>

                {/* Commission % input */}
                <div className="relative w-28">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.percent}
                    onChange={(e) => updateRow(idx, 'percent', e.target.value)}
                    placeholder={globalRate}
                    className="w-full px-3 py-2 pr-7 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-mono text-right text-[#0F172A]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs pointer-events-none">
                    %
                  </span>
                </div>

                {/* Remove row button */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors text-base font-bold"
                  title="Remove row"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add row button */}
        {!loadingOperators && (
          <button
            type="button"
            onClick={addRow}
            className="w-full py-2 text-sm text-[#2563EB] border border-dashed border-[#BFDBFE] rounded-lg hover:bg-[#EFF6FF] transition-colors font-medium"
          >
            + Add Operator
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" loading={isSaving} onClick={handleSave}>
            Save Commissions
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Users() {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuthStore()
  const ready = useIsReady()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [blockModal, setBlockModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [blockReason, setBlockReason] = useState('')
  const [viewUser, setViewUser] = useState(null)
  const [commissionModal, setCommissionModal] = useState(null)
  const [commissionValue, setCommissionValue] = useState('')
  const [operatorCommissionModal, setOperatorCommissionModal] = useState(null) // retailer user object
  const [contactModal, setContactModal] = useState(null)
  const [contactForm, setContactForm] = useState({ phone: '', email: '' })
  const [apiAccessState, setApiAccessState] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, role: roleFilter }],
    queryFn: () =>
      usersApi.getUsers({
        page,
        limit: 20,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const blockMutation = useMutation({
    mutationFn: ({ id, reason }) => usersApi.blockUser(id, reason),
    onSuccess: () => {
      toast.success('User blocked')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setBlockModal(null)
      setBlockReason('')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const unblockMutation = useMutation({
    mutationFn: (id) => usersApi.unblockUser(id),
    onSuccess: () => {
      toast.success('User unblocked')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteModal(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const apiAccessMutation = useMutation({
    mutationFn: (id) => usersApi.toggleApiAccess(id),

    onMutate: async (userId) => {
      const currentUser = data?.users?.find(
        (user) => user._id === userId
      );

      const currentValue =
        apiAccessState[userId] ??
        currentUser?.apiAccessEnabled ??
        false;

      setApiAccessState((prev) => ({
        ...prev,
        [userId]: !currentValue,
      }));

      return {
        previousValue: currentValue,
      };
    },

    onSuccess: (res, userId, context) => {
      const updatedValue =
        res.data?.data?.apiAccessEnabled ??
        !context.previousValue;

      setApiAccessState((prev) => ({
        ...prev,
        [userId]: updatedValue,
      }));

      toast.success(
        res.data?.message || 'API access updated'
      );

      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
    },

    onError: (err, userId, context) => {
      setApiAccessState((prev) => ({
        ...prev,
        [userId]: context?.previousValue ?? false,
      }));
      toast.error(extractError(err));
    },
  });

  const commissionMutation = useMutation({
    mutationFn: ({ id, rate }) => usersApi.updateCommission(id, rate),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Commission updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCommissionModal(null)
      setCommissionValue('')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const operatorCommissionMutation = useMutation({
    mutationFn: ({ id, commissions }) => usersApi.updateOperatorCommissions(id, commissions),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Operator commissions updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOperatorCommissionModal(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const contactMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.updateContact(id, data),
    onSuccess: () => {
      toast.success('Contact details updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setContactModal(null)
      setContactForm({ phone: '', email: '' })
    },
    onError: (err) => toast.error(extractError(err)),
  })


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Users</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Manage retailers and admins</p>
        </div>
        <Button leftIcon={<UserPlus size={16} />} onClick={() => setCreateModal(true)}>
          Add User
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              placeholder="Search by name, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="text-sm border border-[#E2E8F0] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">All Roles</option>
            {USER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : !data?.items?.length ? (
          <EmptyState title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    {['User', 'Phone', 'Role', 'Business', 'Commission', 'Status', 'API Access', 'Created', 'Actions'].map(
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
                  {data.items.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#2563EB] text-xs font-semibold shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium text-[#0F172A]">{user.name}</p>
                            <p className="text-xs text-[#94A3B8]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{user.phone}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.role === 'super_admin'
                              ? 'purple'
                              : user.role === 'admin'
                                ? 'primary'
                                : 'default'
                          }
                        >
                          {user.role?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{user.businessName || '—'}</td>
                      <td className="px-4 py-3">
                        {user.role === 'retailer' ? (
                          <div className="flex items-center gap-1.5">
                            {/* Global commission rate badge */}
                            {/* <button
                              type="button"
                              onClick={() => {
                                setCommissionModal(user)
                                setCommissionValue(((user.commissionRate || 0) * 100).toFixed(2))
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] text-xs font-semibold hover:bg-[#DDD6FE] transition-colors cursor-pointer"
                              title="Edit global commission"
                            >
                              {((user.commissionRate || 0) * 100).toFixed(2)}
                              <Percent size={11} />
                            </button> */}
                            {/* Operator-wise commission button */}
                            <button
                              type="button"
                              onClick={() => setOperatorCommissionModal(user)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold hover:bg-[#BBF7D0] transition-colors cursor-pointer"
                              title="Set per-operator commission"
                            >
                              <Settings2 size={11} />
                              {user.operatorCommissions?.length > 0
                                ? `${user.operatorCommissions.length} ops`
                                : 'By Op'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isBlocked ? 'danger' : 'success'}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        {user.role === 'retailer' ? (
                          (() => {
                            const isApiEnabled =
                              apiAccessState[user._id] ??
                              user.apiAccessEnabled ??
                              false;

                            const isUpdating =
                              apiAccessMutation.isPending &&
                              apiAccessMutation.variables === user._id;

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isUpdating) {
                                    apiAccessMutation.mutate(user._id);
                                  }
                                }}
                                disabled={isUpdating}
                                title={
                                  isApiEnabled
                                    ? 'Disable API Access'
                                    : 'Enable API Access'
                                }
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isUpdating
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                                  }`}
                              >
                                {isApiEnabled ? (
                                  <>
                                    <ToggleRight
                                      size={20}
                                      className="text-[#16A34A]"
                                    />
                                    <span className="text-[#16A34A]">
                                      On
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft
                                      size={20}
                                      className="text-[#94A3B8]"
                                    />
                                    <span className="text-[#94A3B8]">
                                      Off
                                    </span>
                                  </>
                                )}
                              </button>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-[#94A3B8]">
                            N/A
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                        {formatDateTime(user.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewUser(user)}
                            className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#475569] transition-colors"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setEditModal(user)}
                            className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { setContactModal(user); setContactForm({ phone: user.phone || '', email: user.email || '' }) }}
                            className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors"
                            title="Edit Phone/Email"
                          >
                            <Phone size={14} />
                          </button>
                          {user.isBlocked ? (
                            <button
                              onClick={() => unblockMutation.mutate(user._id)}
                              className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#16A34A] transition-colors"
                              title="Unblock"
                            >
                              <CheckCircle size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlockModal(user)}
                              className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"
                              title="Block"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {isSuperAdmin() && (
                            <button
                              onClick={() => setDeleteModal(user)}
                              className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CreateUserModal open={createModal} onClose={() => setCreateModal(false)} />

      <EditUserModal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        user={editModal}
      />

      <Modal
        open={!!blockModal}
        onClose={() => setBlockModal(null)}
        title="Block User"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-[#475569]">
            Block <strong>{blockModal?.name}</strong>?
          </p>
          <Input
            label="Reason"
            placeholder="Suspicious activity"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setBlockModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() =>
                blockMutation.mutate({ id: blockModal._id, reason: blockReason })
              }
              loading={blockMutation.isPending}
            >
              Block
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deleteMutation.mutate(deleteModal._id)}
        title="Delete User"
        message={`Permanently delete ${deleteModal?.name}? This will remove all their data and cannot be undone.`}
        confirmLabel="Delete Permanently"
        loading={deleteMutation.isPending}
      />

      <Modal
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        title="User Details"
        size="sm"
      >
        {viewUser && (
          <div className="space-y-1 text-sm">
            {[
              ['Name', viewUser.name],
              ['Email', viewUser.email],
              ['Phone', viewUser.phone],
              ['Role', viewUser.role?.replace('_', ' ')],
              ['Business', viewUser.businessName || '—'],
              ['GST', viewUser.gstNumber || '—'],
              ['PAN', viewUser.panNumber || '—'],
              ['Commission', viewUser.role === 'retailer' ? `${((viewUser.commissionRate || 0) * 100).toFixed(2)}%` : 'N/A'],
              ['Status', viewUser.isBlocked ? 'Blocked' : 'Active'],
              ['Created', formatDateTime(viewUser.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between py-2 border-b border-[#E2E8F0] last:border-0"
              >
                <span className="text-[#94A3B8]">{label}</span>
                <span className="font-medium text-[#0F172A] capitalize">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Global commission rate modal */}
      <Modal
        open={!!commissionModal}
        onClose={() => { setCommissionModal(null); setCommissionValue('') }}
        title={`Global Commission — ${commissionModal?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">
            Set the <strong>default</strong> commission for <strong>{commissionModal?.name}</strong>.
            This applies to operators that don't have a specific rate set.
          </p>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Default Commission Rate (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                placeholder="2.00"
                className="flex-1 px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
              />
              <span className="text-[#475569] font-semibold">%</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Current: {((commissionModal?.commissionRate || 0) * 100).toFixed(2)}% — Enter value between 0 and 100
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setCommissionModal(null); setCommissionValue('') }} type="button">
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={commissionMutation.isPending}
              onClick={() => {
                const rate = parseFloat(commissionValue) / 100
                commissionMutation.mutate({ id: commissionModal._id, rate })
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Operator-wise commission modal */}
      <OperatorCommissionModal
        user={operatorCommissionModal}
        onClose={() => setOperatorCommissionModal(null)}
        onSave={(commissions) =>
          operatorCommissionMutation.mutate({ id: operatorCommissionModal._id, commissions })
        }
        isSaving={operatorCommissionMutation.isPending}
      />

      <Modal
        open={!!contactModal}
        onClose={() => { setContactModal(null); setContactForm({ phone: '', email: '' }) }}
        title={`Edit Contact — ${contactModal?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">
            Update phone number or email for <strong>{contactModal?.name}</strong>.
          </p>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Phone Number</label>
            <input
              type="text"
              value={contactForm.phone}
              onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210"
              maxLength={10}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Email Address</label>
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setContactModal(null); setContactForm({ phone: '', email: '' }) }}
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={contactMutation.isPending}
              onClick={() => {
                const payload = {}
                if (contactForm.phone && contactForm.phone !== contactModal.phone) payload.phone = contactForm.phone
                if (contactForm.email && contactForm.email !== contactModal.email) payload.email = contactForm.email
                if (!Object.keys(payload).length) { toast.error('No changes detected'); return }
                contactMutation.mutate({ id: contactModal._id, data: payload })
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
