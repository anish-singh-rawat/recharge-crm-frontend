import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col max-h-[90vh]',
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] shrink-0 bg-[#F8FAFC] rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
