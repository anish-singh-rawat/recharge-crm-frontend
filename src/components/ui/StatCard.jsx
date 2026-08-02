import clsx from 'clsx'

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-[#DBEAFE]',
  iconColor = 'text-[#2563EB]',
  trend,
  trendLabel,
  className = '',
}) {
  const trendPositive = trend > 0
  const trendNeutral = trend === 0 || trend === undefined

  return (
    <div
      className={clsx(
        'bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E2E8F0]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0F172A] font-mono truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[#94A3B8] truncate">{subtitle}</p>
          )}
          {!trendNeutral && (
            <p
              className={clsx(
                'mt-1 text-xs font-medium',
                trendPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
              )}
            >
              {trendPositive ? '↑' : '↓'} {Math.abs(trend)}%{' '}
              {trendLabel || 'vs last period'}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'w-11 h-11 rounded-lg flex items-center justify-center shrink-0',
              iconBg
            )}
          >
            <span className={iconColor}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
