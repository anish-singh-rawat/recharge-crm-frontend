import clsx from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightElement,
    className = '',
    containerClass = '',
    required,
    ...props
  },
  ref
) {
  return (
    <div className={clsx('flex flex-col gap-1', containerClass)}>
      {label && (
        <label className="text-xs font-medium text-[#475569]">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#94A3B8] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full border rounded-md bg-white text-[#0F172A] placeholder:text-[#94A3B8] text-sm transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]',
            'disabled:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-[#DC2626] focus:ring-[#DC2626]'
              : 'border-[#E2E8F0]',
            leftIcon ? 'pl-9' : 'pl-3',
            rightElement ? 'pr-10' : 'pr-3',
            'py-2',
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3">{rightElement}</span>
        )}
      </div>
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
    </div>
  )
})

export default Input
