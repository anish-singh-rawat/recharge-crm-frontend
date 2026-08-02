import clsx from 'clsx'

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-[#F1F5F9] text-[#475569]',
    primary: 'bg-[#DBEAFE] text-[#2563EB]',
    success: 'bg-[#DCFCE7] text-[#16A34A]',
    warning: 'bg-[#FEF3C7] text-[#D97706]',
    danger: 'bg-[#FEE2E2] text-[#DC2626]',
    info: 'bg-[#CFFAFE] text-[#0891B2]',
    purple: 'bg-[#EDE9FE] text-[#7C3AED]',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
