import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Zap,
  Wallet,
  Users,
  BarChart2,
  Bell,
  Settings,
  Key,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wifi,
  BookOpen,
} from 'lucide-react'
import clsx from 'clsx'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { disconnectSocket } from '@/hooks/useSocket'
import toast from 'react-hot-toast'
import { getInitials } from '@/utils/format'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'retailer'] },
  { to: '/recharge', label: 'Recharge', icon: Zap, roles: ['retailer'] },
  { to: '/wallet', label: 'Wallet', icon: Wallet, roles: ['retailer'] },
  { to: '/admin/wallet', label: 'Wallet', icon: Wallet, roles: ['admin', 'super_admin'] },
  { to: '/admin/recharge', label: 'Transactions', icon: Zap, roles: ['admin', 'super_admin'] },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['admin', 'super_admin'] },
  { to: '/admin/operators', label: 'Operators', icon: Building2, roles: ['admin', 'super_admin'] },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['admin', 'super_admin', 'retailer'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'super_admin', 'retailer'] },
  { to: '/api-keys', label: 'API Keys', icon: Key, roles: ['admin', 'super_admin', 'retailer'] },
  { to: '/api-docs', label: 'API Docs', icon: BookOpen, roles: ['admin', 'super_admin', 'retailer'] },
  { to: '/admin/logs', label: 'Logs', icon: FileText, roles: ['admin', 'super_admin'] },
  { to: '/admin/provider', label: 'Provider', icon: Wifi, roles: ['admin', 'super_admin'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin', 'super_admin'] },
]

export default function Sidebar({ collapsed, onToggle, unreadCount = 0 }) {
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {}
    disconnectSocket()
    logout()
  }

  const role = user?.role || ''
  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-[#1E293B] flex flex-col z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#334155] shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm truncate">RechargeCRM</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center mx-auto">
            <Zap size={14} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={clsx(
            'p-1 rounded hover:bg-[#334155] text-[#94A3B8] transition-colors shrink-0',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-2 text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.length === 0 && (
          <div className="space-y-1 px-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-lg bg-[#334155] animate-pulse opacity-40"
              />
            ))}
          </div>
        )}
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="shrink-0 relative">
                  <item.icon size={18} />
                  {item.to === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F172A] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#334155] p-3 shrink-0">
        <NavLink
          to="/profile"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#334155] transition-colors group',
            collapsed && 'justify-center'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-[#94A3B8] capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className={clsx(
            'mt-1 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors w-full group',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
