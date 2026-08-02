import clsx from 'clsx'

export default function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        padding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 mb-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
