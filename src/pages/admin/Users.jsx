import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Search, Ban, CheckCircle, Trash2, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api/users'
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
                    {['User', 'Phone', 'Role', 'Business', 'Status', 'Created', 'Actions'].map(
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
                        <Badge variant={user.isBlocked ? 'danger' : 'success'}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
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
        message={`Are you sure you want to delete ${deleteModal?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
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
    </div>
  )
}
