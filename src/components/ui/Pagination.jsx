import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null

  const { page, totalPages, total, limit } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const pages = []
  const delta = 2
  const left = Math.max(1, page - delta)
  const right = Math.min(totalPages, page + delta)

  if (left > 1) {
    pages.push(1)
    if (left > 2) pages.push('...')
  }
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
      <p className="text-xs text-[#94A3B8]">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#475569]"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[#94A3B8] text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-8 h-8 text-sm rounded transition-colors',
                p === page
                  ? 'bg-[#2563EB] text-white font-medium'
                  : 'hover:bg-[#F1F5F9] text-[#475569]'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#475569]"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
