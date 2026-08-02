import clsx from 'clsx'

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  }
  return (
    <span
      className={clsx(
        'inline-block rounded-full border-[#2563EB] border-t-transparent animate-spin',
        sizes[size],
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#E2E8F0]">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-[#E2E8F0] rounded flex-1"
              style={{ opacity: 1 - j * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
