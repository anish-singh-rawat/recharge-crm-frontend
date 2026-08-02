import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, Radio, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notificationsApi } from '@/api/notifications'
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
import { formatTimeAgo, extractError } from '@/utils/format'
import { NOTIFICATION_TYPES } from '@/utils/constants'
import useAuthStore from '@/store/authStore'
import clsx from 'clsx'
import { useIsReady } from '@/hooks/useIsReady'

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title required'),
  message: z.string().min(1, 'Message required'),
  type: z.string().min(1, 'Type required'),
  roles: z.string().optional(),
})

const sendSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  title: z.string().min(1, 'Title required'),
  message: z.string().min(1, 'Message required'),
  type: z.string().min(1, 'Type required'),
})

function SendNotificationModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(sendSchema),
    defaultValues: { type: 'INFO' },
  })

  const mutation = useMutation({
    mutationFn: (data) => notificationsApi.sendNotification({
      ...data,
      channel: 'IN_APP',
    }),
    onSuccess: () => {
      toast.success('Notification sent!')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Send Notification" size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          label="User ID"
          placeholder="MongoDB ObjectId of user"
          error={errors.userId?.message}
          required
          {...register('userId')}
        />
        <Input
          label="Title"
          placeholder="Notification title"
          error={errors.title?.message}
          required
          {...register('title')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#475569]">
            Message <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            placeholder="Notification message"
            className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
            rows={3}
            {...register('message')}
          />
          {errors.message && <p className="text-xs text-[#DC2626]">{errors.message.message}</p>}
        </div>
        <Select
          label="Type"
          options={NOTIFICATION_TYPES.map((t) => ({ value: t, label: t }))}
          error={errors.type?.message}
          required
          {...register('type')}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" type="submit" loading={mutation.isPending} leftIcon={<Send size={14} />}>
            Send
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function BroadcastModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { type: 'INFO', roles: 'retailer' },
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      notificationsApi.broadcastNotification({
        ...data,
        roles: data.roles ? [data.roles] : undefined,
      }),
    onSuccess: () => {
      toast.success('Broadcast sent!')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      reset()
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Broadcast Notification" size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          label="Title"
          placeholder="Maintenance Tonight"
          error={errors.title?.message}
          required
          {...register('title')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#475569]">
            Message <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            placeholder="Scheduled downtime 2AM–4AM"
            className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
            rows={3}
            {...register('message')}
          />
          {errors.message && <p className="text-xs text-[#DC2626]">{errors.message.message}</p>}
        </div>
        <Select
          label="Type"
          options={NOTIFICATION_TYPES.map((t) => ({ value: t, label: t }))}
          error={errors.type?.message}
          required
          {...register('type')}
        />
        <Select
          label="Target Role"
          options={[
            { value: '', label: 'All Users' },
            { value: 'retailer', label: 'Retailers' },
            { value: 'admin', label: 'Admins' },
          ]}
          {...register('roles')}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            className="flex-1"
            type="submit"
            loading={mutation.isPending}
            leftIcon={<Radio size={14} />}
          >
            Broadcast
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Notifications() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuthStore()
  const admin = isAdmin()
  const ready = useIsReady()
  const [page, setPage] = useState(1)
  const [isReadFilter, setIsReadFilter] = useState('')
  const [broadcastModal, setBroadcastModal] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'my', { page, isRead: isReadFilter }],
    queryFn: () =>
      notificationsApi.getMyNotifications({
        page,
        limit: 20,
        ...(isReadFilter !== '' && { isRead: isReadFilter }),
      }),
    select: (r) => r.data.data,
    enabled: ready,
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All marked as read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationsApi.markOneRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      toast.success('Notification deleted')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const getTypeBadgeVariant = (type) => {
    const map = {
      INFO: 'primary',
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'danger',
      ALERT: 'danger',
    }
    return map[type] || 'default'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Notifications</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            {data?.unreadCount > 0 ? `${data.unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data?.unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCheck size={14} />}
              onClick={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            >
              Mark all read
            </Button>
          )}
          {admin && (
            <>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Send size={14} />}
                onClick={() => setSendModal(true)}
              >
                Send
              </Button>
              <Button
                size="sm"
                leftIcon={<Radio size={14} />}
                onClick={() => setBroadcastModal(true)}
              >
                Broadcast
              </Button>
            </>
          )}
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3">
          <select
            value={isReadFilter}
            onChange={(e) => { setIsReadFilter(e.target.value); setPage(1) }}
            className="text-sm border border-[#E2E8F0] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-[#F1F5F9] rounded-lg" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <EmptyState title="No notifications" icon={Bell} />
        ) : (
          <>
            <div className="divide-y divide-[#E2E8F0]">
              {data.items.map((notif) => (
                <div
                  key={notif._id}
                  className={clsx(
                    'flex items-start gap-3 px-4 py-3.5 transition-colors',
                    !notif.isRead && 'bg-[#F8FAFC]',
                    'hover:bg-[#F1F5F9]'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: notif.isRead ? '#CBD5E1' : '#2563EB' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={clsx('text-sm', !notif.isRead ? 'font-semibold text-[#0F172A]' : 'font-medium text-[#475569]')}>
                        {notif.title}
                      </p>
                      <Badge variant={getTypeBadgeVariant(notif.type)}>{notif.type}</Badge>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-[#CBD5E1] mt-1">{formatTimeAgo(notif.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => markOneMutation.mutate(notif._id)}
                        className="p-1.5 rounded hover:bg-[#DBEAFE] text-[#2563EB] transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    {admin && (
                      <button
                        onClick={() => setDeleteTarget(notif)}
                        className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626] transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </Card>

      <BroadcastModal open={broadcastModal} onClose={() => setBroadcastModal(false)} />
      <SendNotificationModal open={sendModal} onClose={() => setSendModal(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Notification"
        message="Delete this notification permanently?"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
