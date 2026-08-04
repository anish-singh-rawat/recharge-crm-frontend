import clsx from 'clsx'
import { Flame, Wifi, Phone, MessageSquare, Clock, Zap } from 'lucide-react'

export default function PlanCard({ plan, isSelected = false, onSelect }) {
  const {
    amount,
    validity,
    dataAmount,
    description,
    smsCount,
    talktime,
    isPopular,
  } = plan

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={clsx(
        'relative w-full text-left rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1',
        'hover:shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:-translate-y-px',
        isSelected
          ? 'border-[#2563EB] bg-[#EFF6FF] shadow-[0_4px_12px_rgba(37,99,235,0.18)]'
          : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]',
      )}
    >

      {isPopular && (
        <span className="absolute -top-2.5 left-3 inline-flex items-center gap-0.5 rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <Flame size={9} />
          Popular
        </span>
      )}

      <div className="p-3">

        <div className="flex items-baseline justify-between gap-1 mb-2">
          <span
            className={clsx(
              'text-xl font-extrabold font-mono leading-none',
              isSelected ? 'text-[#2563EB]' : 'text-[#0F172A]',
            )}
          >
            ₹{amount}
          </span>
          {validity ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#2563EB] bg-[#DBEAFE] px-1.5 py-0.5 rounded-full shrink-0">
              <Clock size={9} />
              {validity}
            </span>
          ) : null}
        </div>


        <div className="flex flex-wrap gap-1 mb-2">
          {dataAmount ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full">
              <Wifi size={9} />
              {dataAmount}
            </span>
          ) : null}
          {talktime > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-full">
              <Phone size={9} />
              {talktime === 99999 ? 'Unlimited' : `₹${talktime}`}
            </span>
          ) : (
            /unlimited/i.test(description) ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-full">
                <Phone size={9} />
                Unlimited Calling
              </span>
            ) : null
          )}
          {smsCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#0891B2] bg-[#CFFAFE] px-1.5 py-0.5 rounded-full">
              <MessageSquare size={9} />
              {smsCount === 99999 ? 'Unlimited SMS' : `${smsCount} SMS/day`}
            </span>
          ) : null}
        </div>


        {description ? (
          <p className="text-[10px] text-[#94A3B8] line-clamp-2 leading-snug mb-2">
            {description}
          </p>
        ) : null}


        <div
          className={clsx(
            'w-full rounded-lg py-1.5 text-xs font-semibold text-center transition-colors duration-150',
            isSelected
              ? 'bg-[#2563EB] text-white'
              : 'bg-[#DBEAFE] text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white',
          )}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <Zap size={11} />
            {isSelected ? 'Selected' : 'Recharge'}
          </span>
        </div>
      </div>
    </button>
  )
}
