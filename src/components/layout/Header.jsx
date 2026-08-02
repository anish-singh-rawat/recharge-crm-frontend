import { Bell, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getInitials } from '@/utils/format'

export default function Header({ onMenuClick, unreadCount }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-[#E2E8F0] z-30 flex items-center px-4 gap-3">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#475569] transition-colors lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <button
        onClick={() => navigate('/notifications')}
        className="relative p-2 rounded-lg hover:bg-[#F1F5F9] text-[#475569] transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#DC2626] text-white text-[10px] rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Link
        to="/profile"
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {getInitials(user?.name)}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-[#0F172A] leading-tight">{user?.name}</p>
          <p className="text-xs text-[#94A3B8] capitalize leading-tight">
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
      </Link>
    </header>
  )
}
