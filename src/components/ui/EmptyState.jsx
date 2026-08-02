import { Inbox } from 'lucide-react'

export default function EmptyState({ icon, title = 'No data found', description, action }) {
  const Icon = icon || Inbox
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#94A3B8]" />
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#94A3B8] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
