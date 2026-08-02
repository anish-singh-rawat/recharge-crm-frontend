import clsx from 'clsx'

const variants = {
  primary:
    'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm',
  secondary:
    'bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]',
  danger:
    'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm',
  ghost:
    'bg-transparent hover:bg-[#F1F5F9] text-[#475569]',
  outline:
    'bg-transparent border border-[#2563EB] text-[#2563EB] hover:bg-[#DBEAFE]',
  success:
    'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm',
}

const sizes = {
  xs: 'px-2 py-1 text-xs rounded',
  sm: 'px-3 py-1.5 text-sm rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-5 py-2.5 text-base rounded-md',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}
