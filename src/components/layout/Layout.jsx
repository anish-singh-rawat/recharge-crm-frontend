import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { notificationsApi } from '@/api/notifications'
import { useSocket } from '@/hooks/useSocket'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/utils/format'
import clsx from 'clsx'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const queryClient = useQueryClient()
  const { updateUser } = useAuthStore()

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'my', { page: 1, limit: 1 }],
    queryFn: () => notificationsApi.getMyNotifications({ page: 1, limit: 1 }),
    select: (r) => r.data.data,
    refetchInterval: 60000,
  })

  const unreadCount = notifData?.unreadCount || 0

  useSocket({
    'notification:new': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast(payload.notification?.title || 'New notification', {
        icon: '🔔',
        style: { fontSize: '13px' },
      })
    },
    'notification:broadcast': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast(payload.notification?.title || 'Broadcast message', {
        icon: '📢',
        style: { fontSize: '13px' },
      })
    },
    'wallet:update': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      if (payload?.balance !== undefined) {
        toast.success(`Wallet balance: ${formatCurrency(payload.balance)}`)
      }
    },
    'wallet:frozen': () => {
      toast.error('Your wallet has been frozen')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    'wallet:unfrozen': () => {
      toast.success('Your wallet has been unfrozen')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    'recharge:success': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['recharge'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      toast.success('Recharge successful!')
    },
    'recharge:failed': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['recharge'] })
      toast.error('Recharge failed')
    },
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          unreadCount={unreadCount}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-60">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              unreadCount={unreadCount}
            />
          </div>
        </div>
      )}

      <div
        className={clsx(
          'transition-all duration-300',
          collapsed ? 'lg:pl-16' : 'lg:pl-60'
        )}
      >
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          unreadCount={unreadCount}
        />
        <main className="pt-16 pb-20 lg:pb-6 min-h-screen">
          <div className="p-4 lg:p-6 max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="lg:hidden">
        <MobileNav unreadCount={unreadCount} />
      </div>
    </div>
  )
}
