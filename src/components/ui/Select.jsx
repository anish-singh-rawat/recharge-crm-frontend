import clsx from 'clsx'
import { forwardRef } from 'react'

const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className = '', containerClass = '', required, ...props },
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
      <select
        ref={ref}
        className={clsx(
          'w-full border rounded-md bg-white text-[#0F172A] text-sm px-3 py-2 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]',
          'disabled:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-[#DC2626]' : 'border-[#E2E8F0]',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
    </div>
  )
})

export default Select
