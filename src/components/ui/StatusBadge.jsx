import { STATUS_COLORS } from '@/utils/constants'

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: '#F1F5F9', text: '#475569' }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {status}
    </span>
  )
}
