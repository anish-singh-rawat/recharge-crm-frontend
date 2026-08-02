import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Zap,
  Wallet,
  BarChart2,
  Bell,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import useAuthStore from '@/store/authStore'

export default function MobileNav({ unreadCount = 0 }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const items = isAdmin
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { to: '/admin/recharge', icon: Zap, label: 'Txns' },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/reports', icon: BarChart2, label: 'Reports' },
        { to: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { to: '/recharge', icon: Zap, label: 'Recharge' },
        { to: '/wallet', icon: Wallet, label: 'Wallet' },
        { to: '/reports', icon: BarChart2, label: 'Reports' },
        { to: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] z-40 flex lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              isActive ? 'text-[#2563EB]' : 'text-[#94A3B8]'
            )
          }
        >
          <span className="relative">
            <item.icon size={20} />
            {item.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[10px] rounded-full flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
